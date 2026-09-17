import {
  FileStack,
  Images,
  FileImage,
  Minimize2,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  href: string;
  label: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  gradient: string;
  tag?: string;
}

export const TOOLS: Tool[] = [
  {
    href: "/merge",
    label: "Merge PDF",
    short: "Merge",
    desc: "Combine multiple PDFs into one document. Drag to reorder before merging.",
    icon: FileStack,
    gradient: "from-blue-500 to-indigo-600",
    tag: "Most popular",
  },
  {
    href: "/images-to-pdf",
    label: "Photos to PDF",
    short: "Photos → PDF",
    desc: "Turn JPG, PNG or WebP photos into a single, clean PDF — one page per photo.",
    icon: Images,
    gradient: "from-rose-500 to-pink-600",
    tag: "New",
  },
  {
    href: "/compress",
    label: "Compress PDF",
    short: "Compress",
    desc: "Shrink PDF file size while keeping it readable. Pick your compression level.",
    icon: Minimize2,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    href: "/split",
    label: "Split PDF",
    short: "Split",
    desc: "Extract page ranges or split a PDF into separate single-page files.",
    icon: Scissors,
    gradient: "from-orange-500 to-amber-600",
  },
  {
    href: "/to-images",
    label: "PDF to Images",
    short: "PDF → Images",
    desc: "Render every page of your PDF as a crisp PNG image. Downloads as a ZIP.",
    icon: FileImage,
    gradient: "from-purple-500 to-violet-600",
  },
];
