import { CallbackTaskCard } from "@/components/callback-task-card";
import { TopNav } from "@/components/top-nav";
import { getCallbackTasks, getCalls } from "@/lib/api";

export default async function CallbackQueuePage() {
  const [tasks, calls] = await Promise.all([getCallbackTasks(), getCalls()]);
  const openTasks = tasks.filter((task) => task.status !== "completed");

  const callByTaskId = new Map(
    calls.flatMap((call) => call.callback_tasks.map((task) => [task.id, call] as const)),
  );

  return (
    <main className="app-shell">
      <TopNav />
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Callback Queue</span>
          <h1>Work the queue without guessing what matters first.</h1>
          <p>Prioritize urgent items, see assignees, and jump into the full call context fast.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Active Tasks</span>
            <h2>{openTasks.length} callback tasks need attention</h2>
          </div>
        </div>

        <div className="queue-grid">
          {openTasks.map((task) => {
            const call = callByTaskId.get(task.id);
            return <CallbackTaskCard key={task.id} task={task} call={call} />;
          })}
        </div>
      </section>
    </main>
  );
}
