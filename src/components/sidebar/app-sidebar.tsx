import { SquareKanban, ListTodo, RefreshCcw } from "lucide-react"

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
import { db } from "@/infra/database/client"
import { DrizzleProjectRepository } from "@/infra/repositories/drizzle-project-repository"
import { ListProjectsUseCase } from "@/application/use-cases/project/list-projects.use-case"

const user = {
  name: "shadcn",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
}

const navProjectItems = [
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
]

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const projectRepository = new DrizzleProjectRepository(db)
  const listProjects = new ListProjectsUseCase({ projectRepository })

  const result = await listProjects.execute()
  const projects = result.success ? result.value.projects : []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher projects={projects} />
      </SidebarHeader>
      <SidebarContent>
        <NavProject items={navProjectItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
