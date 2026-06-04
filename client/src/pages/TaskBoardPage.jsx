import React, { useMemo, useState } from "react";
import { Filter, UserRound, Users } from "lucide-react";
import TaskAssignmentForm from "../components/TaskAssignmentForm";
import TaskList from "../components/TaskList";

const TABS = [
  { id: "mine", label: "Mine" },
  { id: "team", label: "Team" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

export default function TaskBoardPage({
  tasks,
  clients,
  users = [],
  user,
  onCreateTask,
  onDeleteTask,
  onToggleTaskStatus,
}) {
  const [activeTab, setActiveTab] = useState(user?.role === "owner" ? "team" : "mine");

  const assignedToMe = useMemo(() => tasks.filter((task) => task.assignedToUserId === user?._id), [tasks, user]);
  const assignedToOthers = useMemo(
    () => tasks.filter((task) => task.assignedToUserId && task.assignedToUserId !== user?._id),
    [tasks, user]
  );
  const filteredTasks = useMemo(() => {
    if (activeTab === "mine") return assignedToMe;
    if (activeTab === "team") return assignedToOthers;
    if (activeTab === "open") return tasks.filter((task) => task.status === "open");
    if (activeTab === "done") return tasks.filter((task) => task.status === "done");
    return tasks;
  }, [activeTab, assignedToMe, assignedToOthers, tasks]);

  const myLoad = assignedToMe.length;
  const teamLoad = assignedToOthers.length;

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero">
        <div>
          <div className="section-kicker">Tasks</div>
          <h3>Assignment desk</h3>
          <p>Route follow-ups, calls, visits, docs, and reviews without losing ownership.</p>
        </div>
        <div className="action-row">
          <span className="mono-chip"><UserRound size={12} /> {myLoad}</span>
          <span className="mono-chip"><Users size={12} /> {teamLoad}</span>
        </div>
      </section>

      <div className="two-column-grid-wide">
        <TaskAssignmentForm clients={clients} onCreate={onCreateTask} user={user} users={users} />

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Queue</div>
              <h3>My / team follow-ups</h3>
            </div>
            <span className="mono-chip"><Filter size={12} /> {filteredTasks.length}</span>
          </div>

          <div className="filter-chip-row">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <TaskList
            tasks={filteredTasks}
            onDelete={onDeleteTask}
            onToggleStatus={onToggleTaskStatus}
            showClient
            emptyText={activeTab === "team" ? "No team follow-ups." : "No follow-ups."}
          />
        </section>
      </div>
    </div>
  );
}
