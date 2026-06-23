import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimateInView } from "@/components/animate-in-view";

export function CTA() {
  const { t } = useTranslation();

  return (
    <section className="relative z-10 overflow-hidden px-6 pt-0 pb-8 md:pb-12">
      <AnimateInView
        className="mx-auto flex justify-center"
        animation="fade-up"
        delay={200}
      >
        <a
          href="https://www.feishu.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="border-border/40 bg-muted/20 hover:border-border/60 hover:bg-muted/40 group flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-xs transition-all duration-300"
        >
          <img
            src="https://p1-hera.feishucdn.com/tos-cn-i-jbbdkfciu3/1ec7129d900e442d8501d810efdaa369~tplv-jbbdkfciu3-image:0:0.image"
            alt="Feishu"
            className="size-8 shrink-0 object-contain"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground/80 text-sm font-medium">
              {t("AI Engineering Efficiency")}・{t("Li Jiaheng")}
            </span>
            <span className="text-muted-foreground/50 text-xs">
              {t("Having issues? Chat on Feishu")}
            </span>
          </div>
          <ArrowRight className="text-muted-foreground/30 group-hover:text-muted-foreground/60 ml-2 size-4 shrink-0 transition-all duration-300 group-hover:translate-x-0.5" />
        </a>
      </AnimateInView>
    </section>
  );
}
