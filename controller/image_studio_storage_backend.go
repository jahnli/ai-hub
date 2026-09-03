package controller

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/url"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const (
	imageStudioMinIOPrefix = "image"
)

type imageStudioReadSeekCloser interface {
	io.Reader
	io.Seeker
	io.Closer
}

type imageStudioStoredObject struct {
	Body        imageStudioReadSeekCloser
	ContentType string
	ModTime     time.Time
}

type imageStudioMinIOStorage struct {
	client *minio.Client
	bucket string
}

func (storage imageStudioMinIOStorage) Put(ctx context.Context, objectName string, data []byte, contentType string) error {
	_, err := storage.client.PutObject(ctx, storage.bucket, storage.objectName(objectName), bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (storage imageStudioMinIOStorage) Open(ctx context.Context, objectName string) (*imageStudioStoredObject, error) {
	object, err := storage.client.GetObject(ctx, storage.bucket, storage.objectName(objectName), minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	info, err := object.Stat()
	if err != nil {
		_ = object.Close()
		return nil, err
	}
	return &imageStudioStoredObject{
		Body:        object,
		ContentType: info.ContentType,
		ModTime:     info.LastModified,
	}, nil
}

func (storage imageStudioMinIOStorage) Delete(ctx context.Context, objectName string) error {
	return storage.client.RemoveObject(ctx, storage.bucket, storage.objectName(objectName), minio.RemoveObjectOptions{})
}

func (storage imageStudioMinIOStorage) objectName(objectName string) string {
	return path.Join(imageStudioMinIOPrefix, objectName)
}

var (
	imageStudioStorageOnce    sync.Once
	imageStudioStorage        *imageStudioMinIOStorage
	imageStudioStorageInitErr error
)

func getImageStudioStorage() (*imageStudioMinIOStorage, error) {
	imageStudioStorageOnce.Do(func() {
		imageStudioStorage, imageStudioStorageInitErr = newImageStudioMinIOStorage()
	})
	return imageStudioStorage, imageStudioStorageInitErr
}

func newImageStudioMinIOStorage() (*imageStudioMinIOStorage, error) {
	dsn := strings.TrimSpace(os.Getenv("IMAGE_STUDIO_MINIO_DSN"))
	if dsn == "" {
		return nil, errors.New("missing MinIO image studio DSN")
	}

	parsed, err := url.Parse(dsn)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, errors.New("invalid MinIO image studio DSN")
	}
	if parsed.User == nil {
		return nil, errors.New("MinIO image studio DSN must include access key, secret key, and bucket")
	}
	accessKey := parsed.User.Username()
	secretKey, hasSecretKey := parsed.User.Password()
	bucket := strings.TrimPrefix(parsed.Path, "/")
	if accessKey == "" || !hasSecretKey || secretKey == "" || bucket == "" || strings.Contains(bucket, "/") {
		return nil, errors.New("MinIO image studio DSN must include access key, secret key, and bucket")
	}
	if parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, errors.New("MinIO image studio DSN must not contain a query or fragment")
	}

	client, err := minio.New(parsed.Host, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: parsed.Scheme == "https",
	})
	if err != nil {
		return nil, err
	}
	return &imageStudioMinIOStorage{
		client: client,
		bucket: bucket,
	}, nil
}
