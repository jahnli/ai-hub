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
import { ArrowRight, HelpCircle, MessageCircleQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFAQ } from "@/features/dashboard/hooks/use-status-data";
import { PanelWrapper } from "../ui/panel-wrapper";

const FAQ_URL =
  "https://semi-tech.feishu.cn/docx/GhoWd4iMookr4BxbBXcc2Qudn2c#share-PWiQdlsbnoqtqqx2U3UcC8iunTh";

export function FAQPanel() {
  const { t } = useTranslation();
  const { loading } = useFAQ();

  return (
    <PanelWrapper
      title={
        <span className="flex items-center gap-2">
          <HelpCircle className="text-muted-foreground/60 size-4" />
          {t("FAQ")}
        </span>
      }
      loading={loading}
      height="h-80"
      contentClassName="p-0"
    >
      <div className="flex h-80 flex-col items-center justify-center gap-6 px-6">
        <div className="bg-muted/50 flex size-24 items-center justify-center rounded-full">
          <MessageCircleQuestion className="text-primary/70 size-12 stroke-[1.2]" />
        </div>
        <a
          href={FAQ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-muted hover:bg-muted/80 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {t("Click to visit FAQ")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </PanelWrapper>
  );
}
