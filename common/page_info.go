package common

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type PageInfo struct {
	Page     int `json:"page"`      // page num 页码
	PageSize int `json:"page_size"` // page size 页大小

	Total int `json:"total"` // 总条数，后设置
	Items any `json:"items"` // 数据，后设置

	SortBy    string `json:"-"`
	SortOrder string `json:"-"`
}

func (p *PageInfo) GetStartIdx() int {
	return (p.Page - 1) * p.PageSize
}

func (p *PageInfo) GetEndIdx() int {
	return p.Page * p.PageSize
}

func (p *PageInfo) GetPageSize() int {
	return p.PageSize
}

func (p *PageInfo) GetPage() int {
	return p.Page
}

func (p *PageInfo) SetTotal(total int) {
	p.Total = total
}

func (p *PageInfo) SetItems(items any) {
	p.Items = items
}

// validSortColumns defines the allowed sort columns to prevent SQL injection.
var validSortColumns = map[string]bool{
	"id":         true,
	"username":   true,
	"quota":      true,
	"used_quota": true,
	"role":       true,
	"status":     true,
	"created_at": true,
}

// ComputedSortColumns are columns computed in Go after DB fetch (not real DB columns).
var ComputedSortColumns = map[string]bool{
	"sub_quota_used":           true,
	"monthly_total_amount_cny": true,
	"monthly_avg_price_per_mt": true,
	"monthly_total_tokens":     true,
	"monthly_total_requests":   true,
	"total_amount_cny":         true,
	"avg_price_per_mt":         true,
	"total_tokens":             true,
	"total_requests":           true,
}

// IsComputedSortColumn returns true if the sort column is a computed column.
func IsComputedSortColumn(col string) bool {
	return ComputedSortColumns[col]
}

// GetOrderClause returns a safe ORDER BY clause based on SortBy and SortOrder.
// If SortBy is empty or invalid, it returns the provided defaultOrder.
func (p *PageInfo) GetOrderClause(defaultOrder string, allowedColumns map[string]bool) string {
	cols := allowedColumns
	if cols == nil {
		cols = validSortColumns
	}
	if p.SortBy == "" || !cols[p.SortBy] {
		return defaultOrder
	}
	direction := "asc"
	if p.SortOrder == "desc" {
		direction = "desc"
	}
	return p.SortBy + " " + direction
}

func GetPageQuery(c *gin.Context) *PageInfo {
	pageInfo := &PageInfo{}
	// 手动获取并处理每个参数
	if page, err := strconv.Atoi(c.Query("p")); err == nil {
		pageInfo.Page = page
	}
	if pageSize, err := strconv.Atoi(c.Query("page_size")); err == nil {
		pageInfo.PageSize = pageSize
	}
	if pageInfo.Page < 1 {
		// 兼容
		page, _ := strconv.Atoi(c.Query("p"))
		if page != 0 {
			pageInfo.Page = page
		} else {
			pageInfo.Page = 1
		}
	}

	if pageInfo.PageSize == 0 {
		// 兼容
		pageSize, _ := strconv.Atoi(c.Query("ps"))
		if pageSize != 0 {
			pageInfo.PageSize = pageSize
		}
		if pageInfo.PageSize == 0 {
			pageSize, _ = strconv.Atoi(c.Query("size")) // token page
			if pageSize != 0 {
				pageInfo.PageSize = pageSize
			}
		}
		if pageInfo.PageSize == 0 {
			pageInfo.PageSize = ItemsPerPage
		}
	}

	if pageInfo.PageSize > 100 {
		pageInfo.PageSize = 100
	}

	pageInfo.SortBy = c.Query("sort_by")
	sortOrder := c.Query("sort_order")
	if sortOrder == "asc" || sortOrder == "desc" {
		pageInfo.SortOrder = sortOrder
	}

	return pageInfo
}
