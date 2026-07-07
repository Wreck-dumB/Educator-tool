import { Andika } from "next/font/google";

const andika = Andika({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-andika",
});

export default function WorksheetLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${andika.variable} font-[family-name:var(--font-andika)]`}>{children}</div>;
}
