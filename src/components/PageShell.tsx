import type { CSSProperties, ReactNode } from "react"
import Header, { type HeaderProps } from "./Header"
import TopTabs, { type TabItem } from "./TopTabs"

type PageShellProps = {
  activeView: string
  children: ReactNode
  headerProps: HeaderProps
  onChangeView: (view: string) => void
  tabs: TabItem[]
  variant?: "default" | "mlb" | "team"
  style?: CSSProperties
  contentClassName?: string
}

const defaultContentClassName =
  "mx-auto w-full max-w-screen-2xl flex-1 p-3 lg:p-4"

export default function PageShell({
  activeView,
  children,
  headerProps,
  onChangeView,
  tabs,
  variant = "default",
  style,
  contentClassName = defaultContentClassName,
}: PageShellProps) {
  return (
    <div
      className={`${variant === "mlb" || variant === "team" ? "mlb-themed" : ""} flex flex-1 flex-col bg-gray-50`}
      style={style}
    >
      <Header {...headerProps} />
      <TopTabs
        activeView={activeView}
        onChangeView={onChangeView}
        tabs={tabs}
      />
      <main className={contentClassName}>{children}</main>
    </div>
  )
}
