import { KanbanBoard } from "@/components/board/kanban-board";
import { mockColumns } from "@/lib/mock-data";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params;

  const projectName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">{projectName}</h1>
        <p className="text-sm text-muted-foreground">Board</p>
      </div>
      <KanbanBoard columns={mockColumns} />
    </div>
  );
}
