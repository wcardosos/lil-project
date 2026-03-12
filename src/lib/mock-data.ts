export type TaskPriority = "urgent" | "high" | "medium" | "low" | "no-priority";

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  assignee?: { name: string; initials: string };
  labels?: string[];
  identifier: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}

export const mockColumns: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      {
        id: "t1",
        title: "Define authentication flow",
        priority: "medium",
        identifier: "LIL-1",
        labels: ["auth"],
      },
      {
        id: "t2",
        title: "Set up CI/CD pipeline",
        priority: "high",
        identifier: "LIL-2",
        labels: ["devops"],
        assignee: { name: "Alice", initials: "AL" },
      },
      {
        id: "t3",
        title: "Research notification service providers",
        priority: "low",
        identifier: "LIL-3",
      },
    ],
  },
  {
    id: "todo",
    title: "Todo",
    tasks: [
      {
        id: "t4",
        title: "Design onboarding screens",
        priority: "high",
        identifier: "LIL-4",
        labels: ["design"],
        assignee: { name: "Bob", initials: "BO" },
      },
      {
        id: "t5",
        title: "Write API documentation",
        priority: "medium",
        identifier: "LIL-5",
        labels: ["docs"],
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [
      {
        id: "t6",
        title: "Implement Kanban board UI",
        priority: "urgent",
        identifier: "LIL-6",
        labels: ["frontend"],
        assignee: { name: "Charlie", initials: "CH" },
      },
      {
        id: "t7",
        title: "Fix pagination bug in task list",
        priority: "high",
        identifier: "LIL-7",
        assignee: { name: "Alice", initials: "AL" },
      },
    ],
  },
  {
    id: "in-review",
    title: "In Review",
    tasks: [
      {
        id: "t8",
        title: "Sidebar navigation component",
        priority: "medium",
        identifier: "LIL-8",
        labels: ["frontend"],
        assignee: { name: "Bob", initials: "BO" },
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      {
        id: "t9",
        title: "Initial project setup",
        priority: "no-priority",
        identifier: "LIL-9",
        assignee: { name: "Charlie", initials: "CH" },
      },
      {
        id: "t10",
        title: "Configure Tailwind and shadcn/ui",
        priority: "low",
        identifier: "LIL-10",
        labels: ["setup"],
      },
    ],
  },
];
