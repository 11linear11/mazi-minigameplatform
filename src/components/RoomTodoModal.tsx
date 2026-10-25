"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
  Clock,
  Sparkles,
  Flame,
  Zap,
  Coffee,
} from "lucide-react";
import type { Member } from "@/data/mock";

export type RoomTodo = {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo?: string | null;
  assignedToName?: string | null;
  dueDate?: string | null;
  createdBy: string;
  createdByName?: string;
  completedAt?: string | null;
  createdAt: string;
};

type RoomTodoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  members: Member[];
  currentUserId?: string | null;
  socket: any;
};

export default function RoomTodoModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  members,
  currentUserId,
  socket,
}: RoomTodoModalProps) {
  const [todos, setTodos] = useState<RoomTodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "mine" | "done">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [formError, setFormError] = useState("");

  const fetchTodos = useCallback(() => {
    if (!socket || !roomId) return;
    setLoading(true);
    socket.emit("room_todos_get", { roomId }, (res: RoomTodo[] | { error: string }) => {
      setLoading(false);
      if (Array.isArray(res)) {
        setTodos(res);
      }
    });
  }, [socket, roomId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchTodos();

    if (!socket) return;
    const handleUpdated = (updatedTodos: RoomTodo[]) => {
      if (Array.isArray(updatedTodos)) {
        setTodos(updatedTodos);
      }
    };

    socket.on("room_todos_updated", handleUpdated);
    return () => {
      socket.off("room_todos_updated", handleUpdated);
    };
  }, [isOpen, socket, roomId, fetchTodos]);

  const handleToggle = (todoId: string) => {
    // 1. Immediate optimistic UI update!
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              status: t.status === "done" ? "todo" : "done",
              completedAt: t.status === "done" ? null : new Date().toISOString(),
            }
          : t
      )
    );
    // 2. Server sync
    socket?.emit("room_todo_toggle", { roomId, todoId, userId: currentUserId }, (res: any) => {
      if (res?.allTodos) {
        setTodos(res.allTodos);
      }
    });
  };

  const handleDelete = (todoId: string) => {
    // 1. Immediate optimistic UI update!
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    // 2. Server sync
    socket?.emit("room_todo_delete", { roomId, todoId }, (res: any) => {
      if (res?.allTodos) {
        setTodos(res.allTodos);
      }
    });
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError("عنوان تسک الزامی است");
      return;
    }
    setFormError("");

    const assignedMember = members.find((m) => m.id === newAssignee);
    const todoPayload = {
      title: newTitle.trim(),
      description: newDescription.trim(),
      priority: newPriority,
      assignedTo: newAssignee || null,
      assignedToName: assignedMember ? assignedMember.name : null,
      dueDate: newDueDate || null,
    };

    socket?.emit(
      "room_todo_create",
      {
        roomId,
        todo: todoPayload,
        userId: currentUserId,
      },
      (res: any) => {
        if (res?.error) {
          setFormError(res.error);
        } else {
          if (res?.allTodos) {
            setTodos(res.allTodos);
          }
          setNewTitle("");
          setNewDescription("");
          setNewPriority("medium");
          setNewAssignee("");
          setNewDueDate("");
          setShowAddForm(false);
        }
      }
    );
  };

  // Stats
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.status === "done").length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered
  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      if (filter === "active") return t.status !== "done";
      if (filter === "done") return t.status === "done";
      if (filter === "mine") return t.assignedTo === currentUserId;
      return true;
    });
  }, [todos, filter, currentUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-2xl h-[85vh] max-h-[750px] bg-panel rounded-2xl border border-outline shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative shrink-0 flex items-center justify-between px-6 py-4 border-b border-outline bg-gradient-to-r from-emerald-950/40 via-panel-soft to-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <CheckSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface">کارهای گروهی روم (To-Do)</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {roomName}
                </span>
              </div>
              <p className="text-xs text-muted">مدیریت وظایف مشترک، هماهنگی بازی‌ها و برنامه‌ها</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel-dim text-muted hover:text-on-surface hover:bg-panel-high transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar & Quick Stats */}
        <div className="px-6 py-3 border-b border-outline bg-panel-dim/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted flex items-center gap-1.5">
              <span>پیشرفت اهداف روم:</span>
              <span className="text-emerald-400">{completedCount} از {totalCount} انجام شده</span>
            </span>
            <span className="text-emerald-400">{progressPercent}٪</span>
          </div>
          <div className="w-full h-2 rounded-full bg-panel-deep overflow-hidden border border-outline/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters and Add button */}
        <div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-outline bg-panel-deep/50">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-panel-deep border border-outline/60 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === "all" ? "bg-emerald-600 text-white shadow-sm" : "text-muted hover:text-on-surface"
              }`}
            >
              همه ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === "active" ? "bg-emerald-600 text-white shadow-sm" : "text-muted hover:text-on-surface"
              }`}
            >
              در انتظار ({totalCount - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("mine")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === "mine" ? "bg-emerald-600 text-white shadow-sm" : "text-muted hover:text-on-surface"
              }`}
            >
              کارهای من
            </button>
            <button
              type="button"
              onClick={() => setFilter("done")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === "done" ? "bg-emerald-600 text-white shadow-sm" : "text-muted hover:text-on-surface"
              }`}
            >
              انجام‌شده ({completedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              showAddForm
                ? "bg-panel-high text-on-surface border border-outline"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            }`}
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            <span>{showAddForm ? "انصراف" : "تسک جدید"}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {/* New Todo Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateTodo} className="p-4 rounded-xl bg-panel-soft border border-emerald-500/40 shadow-xl space-y-3 animate-fadeIn">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>افزودن کار جدید به روم</span>
              </h3>

              {formError && (
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="عنوان وظیفه (مثلاً: دانلود زیرنویس فیلم، هماهنگی روم شطرنج)..."
                  className="w-full px-3 py-2 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی (اختیاری)..."
                  className="w-full px-3 py-2 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Priority */}
                <div>
                  <label className="block text-[11px] text-muted mb-1 font-semibold">اولویت</label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface focus:outline-none focus:border-emerald-500"
                  >
                    <option value="high">🔥 فوری (High)</option>
                    <option value="medium">⚡ متوسط (Medium)</option>
                    <option value="low">☕ عادی (Low)</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-[11px] text-muted mb-1 font-semibold">مسئول انجام</label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">عمومی (هر کسی)</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.avatar} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[11px] text-muted mb-1 font-semibold">تاریخ مهلت (اختیاری)</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
                >
                  افزودن تسک
                </button>
              </div>
            </form>
          )}

          {/* Todos List */}
          {loading ? (
            <div className="py-16 text-center text-xs text-muted">در حال بارگذاری کارها...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel-soft text-emerald-400 border border-outline mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-sm font-bold text-on-surface">کاری در این بخش وجود ندارد</h3>
              <p className="text-xs text-muted max-w-sm mt-1">
                همه تسک‌ها انجام شده‌اند یا تسک جدیدی ثبت نشده است!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTodos.map((todo) => {
                const isDone = todo.status === "done";
                return (
                  <div
                    key={todo.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                      isDone
                        ? "bg-panel-soft/40 border-outline/50 opacity-65"
                        : "bg-panel-soft/90 border-outline hover:border-emerald-500/40 hover:bg-panel-soft"
                    }`}
                  >
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(todo.id)}
                      className={`mt-0.5 shrink-0 transition-transform active:scale-90 ${
                        isDone ? "text-emerald-400" : "text-muted hover:text-emerald-400"
                      }`}
                    >
                      {isDone ? <CheckSquare size={19} className="fill-emerald-400/20" /> : <Square size={19} />}
                    </button>

                    {/* Todo Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold leading-snug break-words ${
                            isDone ? "line-through text-muted" : "text-on-surface"
                          }`}
                        >
                          {todo.title}
                        </span>

                        {/* Priority Badge */}
                        {todo.priority === "high" && (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
                            <Flame size={10} />
                            فوری
                          </span>
                        )}
                        {todo.priority === "medium" && (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <Zap size={10} />
                            متوسط
                          </span>
                        )}
                        {todo.priority === "low" && (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-300">
                            <Coffee size={10} />
                            عادی
                          </span>
                        )}
                      </div>

                      {todo.description && (
                        <p className={`text-[11px] mt-1 line-clamp-2 ${isDone ? "text-muted/70" : "text-muted"}`}>
                          {todo.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted">
                        {todo.assignedToName && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-panel-deep border border-outline text-emerald-300">
                            <User size={11} />
                            <span>{todo.assignedToName}</span>
                          </span>
                        )}

                        {todo.dueDate && (
                          <span className="flex items-center gap-1 text-muted">
                            <Clock size={11} />
                            <span>مهلت: {todo.dueDate}</span>
                          </span>
                        )}

                        <span>ثبت توسط {todo.createdByName || "کاربر"}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(todo.id)}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="حذف تسک"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
