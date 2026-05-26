import React from "react";
import { formatDateOnly, isOverdue } from "../utils/format";

export default function TaskList({ tasks, onToggleStatus, onDelete, showClient = false, emptyText = "No follow-ups yet." }) {
  if (!tasks.length) {
    return (
      <div className="empty-state compact-empty-state">
        <h4>No follow-ups yet</h4>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const overdue = task.status === "open" && isOverdue(task.dueDate);
        return (
          <article className={`task-card ${task.status === "done" ? "done" : ""}`} key={task._id}>
            <div className="task-card-top">
              <div>
                <div className="task-card-title-row">
                  <strong>{task.title}</strong>
                  <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
                </div>
                {showClient ? <p className="task-client-name">{task.clientName}</p> : null}
              </div>
              <span className={`status-pill ${overdue ? "status-overdue" : "status-neutral"}`}>
                {task.status === "done" ? "Completed" : overdue ? "Overdue" : "Open"}
              </span>
            </div>

            {task.details ? <p className="task-card-details">{task.details}</p> : null}

            <div className="task-card-footer">
              <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No due date"}</span>
              <div className="action-row">
                <button
                  className="secondary"
                  onClick={() => onToggleStatus(task, task.status === "done" ? "open" : "done")}
                  type="button"
                >
                  {task.status === "done" ? "Reopen" : "Mark done"}
                </button>
                <button className="danger" onClick={() => onDelete(task._id)} type="button">
                  Remove
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
