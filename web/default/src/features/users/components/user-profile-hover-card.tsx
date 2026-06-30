/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import * as React from "react";
import { useTranslation } from "react-i18next";
import { getUserAvatarFallback, getUserAvatarStyle } from "@/lib/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { USER_ROLE, USER_ROLES } from "../constants";
import { type UserColumnRow, parseCustomFields, CUSTOM_FIELD_KEYS } from "../types";

interface UserProfileHoverCardProps {
  user: UserColumnRow;
  children: React.ReactNode;
}

function ProfileField(props: { label: string; value?: string | null }) {
  if (!props.value) return null;
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="text-muted-foreground w-12 shrink-0 text-xs">
        {props.label}
      </span>
      <span className="min-w-0 break-all text-sm">{props.value}</span>
    </div>
  );
}

const DEFAULT_BANNER =
  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)";

export function UserProfileHoverCard(props: UserProfileHoverCardProps) {
  const { t } = useTranslation();
  const { user } = props;

  const primaryName = user.display_name || user.username;
  const avatarFallback = getUserAvatarFallback(primaryName);
  const avatarFallbackStyle = getUserAvatarStyle(primaryName);
  const roleConfig = USER_ROLES[user.role as keyof typeof USER_ROLES];
  const customFields = parseCustomFields(user.custom_field_values);
  const isRoot =
    useAuthStore((s) => s.auth.user?.role) === USER_ROLE.ROOT;

  const bannerStyle: React.CSSProperties = user.background_image
    ? {
        backgroundImage: `url(${user.background_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: DEFAULT_BANNER };

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={100}
        render={<span className="cursor-pointer" />}
      >
        {props.children}
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-[20rem] p-0">
        {/* Banner */}
        <div className="h-28 rounded-t-lg" style={bannerStyle} />

        {/* Avatar + Name */}
        <div className="relative px-5 pb-3 pt-0">
          <div className="-mt-8">
            <Avatar className="ring-background size-16 ring-[3px]">
              {user.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={primaryName} />
              )}
              <AvatarFallback
                className="text-base font-semibold text-white"
                style={avatarFallbackStyle}
              >
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-semibold">
                {primaryName}
              </span>
              {roleConfig?.icon && (
                <roleConfig.icon size={14} className="text-primary shrink-0" />
              )}
            </div>
            {user.display_name && user.display_name !== user.username && (
              <div className="text-muted-foreground mt-0.5 truncate text-xs">
                @{user.username}
              </div>
            )}
            {user.description && (
              <div className="text-muted-foreground mt-1 truncate text-xs">
                {user.description}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="bg-border mx-5 h-px" />

        {/* Fields */}
        <div className="px-5 py-2.5">
          <ProfileField
            label={t("Job Level")}
            value={customFields?.[CUSTOM_FIELD_KEYS.JOB_LEVEL]}
          />
          <ProfileField label={t("Department")} value={user.department_name} />
          <ProfileField label={t("Join Date")} value={user.join_date} />
          <ProfileField label={t("Email")} value={user.email} />
          <ProfileField label={t("Job Number")} value={user.job_number} />
          <ProfileField label={t("Job Title")} value={user.job_title} />
          <ProfileField
            label={t("Job Description")}
            value={customFields?.[CUSTOM_FIELD_KEYS.JOB_DESCRIPTION]}
          />
          {isRoot && (
            <>
              <ProfileField label={t("Mobile")} value={user.mobile} />
              <ProfileField
                label={t("Birthday")}
                value={customFields?.[CUSTOM_FIELD_KEYS.BIRTHDAY]}
              />
              <ProfileField
                label={t("Ethnicity")}
                value={customFields?.[CUSTOM_FIELD_KEYS.ETHNICITY]}
              />
              <ProfileField
                label={t("Hometown")}
                value={customFields?.[CUSTOM_FIELD_KEYS.HOMETOWN]}
              />
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
