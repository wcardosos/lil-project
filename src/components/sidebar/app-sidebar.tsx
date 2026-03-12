"use client"

import {
  SquareKanban,
  ListTodo,
  RefreshCcw,
} from "lucide-react"

import { ProjectSwitcher } from "./project-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavProject } from "./nav-project"
import { NavUser } from "./nav-user"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "lilProject",
    },
    {
      name: "TinyPDV",
    },
    {
      name: "Minha Estante",
    },
  ],
  navProjectItems: [
    {
      name: "Board",
      url: "/projects/lil-project/board",
      icon: SquareKanban,
    },
    {
      name: "Tasks",
      url: "#",
      icon: ListTodo,
    },
    {
      name: "Cycles",
      url: "#",
      icon: RefreshCcw,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher projects={data.projects} />
      </SidebarHeader>
      <SidebarContent>
        <NavProject items={data.navProjectItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
