/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/pages/DashboardPage.tsx

import { useState, useEffect, useRef } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";
import {
  FaMicrophone,
  FaTrash,
  FaPlus,
  FaTasks,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaPaperPlane,
} from "react-icons/fa";
import { format } from "date-fns";
import {
  DndContext,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
} from "@dnd-kit/core";

// --- TYPE DEFINITIONS ---
interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "inprogress" | "review" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: string;
}
type ConversationState = "idle" | "listening" | "waiting_for_description";

// --- UI COMPONENTS ---

const Sidebar = () => {
  const { logout } = useAuth();
  const handleLogout = async () => {
    await api.post("/auth/logout");
    logout();
    toast.success("Logged out.");
  };
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6 flex-shrink-0 flex flex-col h-screen">
      <h1 className="text-3xl font-bold text-purple-600">Aura</h1>
      <nav className="mt-10 flex-grow">
        <a
          href="#"
          className="flex items-center gap-3 bg-purple-100 text-purple-700 font-semibold p-3 rounded-lg"
        >
          <FaTasks /> Tasks
        </a>
        <a
          href="#"
          className="flex items-center gap-3 text-gray-600 hover:bg-gray-100 font-semibold p-3 rounded-lg mt-2"
        >
          <FaUser /> Profile
        </a>
        <a
          href="#"
          className="flex items-center gap-3 text-gray-600 hover:bg-gray-100 font-semibold p-3 rounded-lg mt-2"
        >
          <FaCog /> Settings
        </a>
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 font-semibold text-gray-600 hover:text-black"
      >
        <FaSignOutAlt /> Logout
      </button>
    </aside>
  );
};

const Header = ({ onAddTask }: { onAddTask: () => void }) => (
  <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
    <h2 className="text-xl font-semibold text-gray-800">Tasks</h2>
    <div className="flex items-center gap-4">
      <button
        onClick={onAddTask}
        className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center gap-2"
      >
        <FaPlus size={12} /> Add Task
      </button>
      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
    </div>
  </header>
);

const TaskCard = ({ task, onUpdate }: { task: Task; onUpdate: () => void }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task._id,
    data: { task },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const priorityClasses = {
    high: "border-red-500",
    medium: "border-yellow-500",
    low: "border-blue-500",
  };

  const handleDelete = async () => {
    await api.delete(`/tasks/${task._id}`);
    toast.success("Task deleted!");
    onUpdate();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-4 rounded-md shadow-sm border-l-4 ${
        priorityClasses[task.priority]
      } touch-none cursor-grab`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-gray-800 pr-2">{task.title}</h3>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 flex-shrink-0"
        >
          <FaTrash />
        </button>
      </div>
      {task.description && (
        <p className="text-gray-600 text-sm mt-2">{task.description}</p>
      )}
      {task.dueDate && (
        <p className="text-purple-600 text-xs mt-3 font-semibold">
          Due: {format(new Date(task.dueDate), "MMM d, yy")}
        </p>
      )}
    </div>
  );
};

const TaskColumn = ({
  id,
  title,
  tasks,
  onUpdate,
}: {
  id: string;
  title: string;
  tasks: Task[];
  onUpdate: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 p-4 rounded-lg w-full h-full transition-colors ${
        isOver ? "bg-purple-100" : ""
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700">
          {title} ({tasks.length})
        </h2>
      </div>
      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
};

const AddTaskModal = ({
  onClose,
  onTaskAdded,
}: {
  onClose: () => void;
  onTaskAdded: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Title is required.");
    try {
      await api.post("/tasks", {
        title,
        description,
        priority,
        status: "todo",
      });
      toast.success("Task added!");
      onTaskAdded();
      onClose();
    } catch (error) {
      toast.error("Failed to add task.");
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-800">
        <h2 className="text-2xl font-bold mb-6">Add a New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block font-semibold mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="description" className="block font-semibold mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="priority" className="block font-semibold mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-purple-600 text-white font-semibold"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OnboardingModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center"
    onClick={onClose}
  >
    <div className="bg-white text-gray-800 p-8 rounded-lg shadow-2xl max-w-sm text-center">
      <h3 className="text-2xl font-bold">Welcome to Aura!</h3>
      <p className="mt-4">
        I'm your AI assistant. To get started, click the pulsing purple orb in
        the bottom-right corner and tell me what you need to do.
      </p>
      <button
        onClick={onClose}
        className="mt-6 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg w-full"
      >
        Got it!
      </button>
    </div>
  </div>
);

const AuraButton = ({
  state,
  onClick,
}: {
  state: ConversationState;
  onClick: () => void;
}) => (
  <div className="fixed bottom-10 right-10 z-[100]">
    <button
      onClick={onClick}
      className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-2xl transition-all duration-300 ${
        state === "listening"
          ? "bg-green-500 scale-110"
          : "bg-purple-600 hover:bg-purple-500"
      } ${state === "waiting_for_description" ? "ring-4 ring-yellow-400" : ""}`}
    >
      {state === "listening" ? <FaPaperPlane /> : <FaMicrophone />}
    </button>
  </div>
);

// --- MAIN DASHBOARD PAGE ---
export default function DashboardPage() {
  const { logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversationState, setConversationState] =
    useState<ConversationState>("idle");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        logout();
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem("hasSeenAuraOnboarding", "true");
    setShowOnboarding(false);
  };

  const playAssistantVoice = async (text: string) => {
    try {
      const res = await api.post("/tts", { text });
      const audio = new Audio(res.data.audioUrl);
      audio.play();
    } catch (error) {
      console.error("Failed to play TTS audio", error);
    }
  };

  const handleVoiceCommand = async () => {
    setConversationState("idle");
    toast.loading("Processing...", { id: "voice-toast" });
    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob);
    const currentState = activeTaskId ? "waiting_for_description" : "idle";
    formData.append("state", currentState);
    if (activeTaskId) formData.append("taskId", activeTaskId);

    try {
      const res = await api.post("/voice-command", formData);
      const { status, responseText, taskId } = res.data;
      playAssistantVoice(responseText);

      if (status === "prompt_description") {
        setConversationState("waiting_for_description");
        setActiveTaskId(taskId);
      } else {
        setConversationState("idle");
        setActiveTaskId(null);
      }

      // Always re-fetch tasks to ensure the UI is in sync with the database.
      fetchTasks();
      toast.success("Done!", { id: "voice-toast" });
    } catch (error) {
      toast.error("Sorry, something went wrong.", { id: "voice-toast" });
      setConversationState("idle");
    }
  };

  const handleMicClick = async () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.start();
      audioChunks.current = [];
      setConversationState("listening");
      toast("Listening...", { icon: "🎤" });
      mediaRecorder.current.addEventListener("dataavailable", (event) =>
        audioChunks.current.push(event.data)
      );
      mediaRecorder.current.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        handleVoiceCommand();
      });
    } catch (error) {
      toast.error("Microphone access is required.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id);
      const newStatus = String(over.id) as Task["status"];
      setTasks((tasks) =>
        tasks.map((task) =>
          task._id === activeId ? { ...task, status: newStatus } : task
        )
      );
      try {
        await api.patch(`/tasks/${activeId}`, { status: newStatus });
        toast.success("Task status updated!");
      } catch (error) {
        toast.error("Failed to sync. Reverting.");
        fetchTasks();
      }
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inprogressTasks = tasks.filter((t) => t.status === "inprogress");
  const reviewTasks = tasks.filter((t) => t.status === "review");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 flex">
      <Sidebar />
      <div className="flex-grow flex flex-col h-screen">
        <Header onAddTask={() => setIsModalOpen(true)} />
        <main className="p-8 flex-grow overflow-y-auto">
          <DndContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 h-full">
              <TaskColumn
                id="todo"
                title="To-do"
                tasks={todoTasks}
                onUpdate={fetchTasks}
              />
              <TaskColumn
                id="inprogress"
                title="In Progress"
                tasks={inprogressTasks}
                onUpdate={fetchTasks}
              />
              <TaskColumn
                id="review"
                title="In Review"
                tasks={reviewTasks}
                onUpdate={fetchTasks}
              />
              <TaskColumn
                id="done"
                title="Done"
                tasks={doneTasks}
                onUpdate={fetchTasks}
              />
            </div>
          </DndContext>
        </main>
      </div>
      <AuraButton state={conversationState} onClick={handleMicClick} />
      {isModalOpen && (
        <AddTaskModal
          onClose={() => setIsModalOpen(false)}
          onTaskAdded={fetchTasks}
        />
      )}
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
    </div>
  );
}
