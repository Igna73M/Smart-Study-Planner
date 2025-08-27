let tasks = JSON.parse(localStorage.getItem("studyTasks") || "[]");
let editingTaskId = null;
let quill = new Quill("#quillEditor", { theme: "snow" });

function saveTasks() {
  localStorage.setItem("studyTasks", JSON.stringify(tasks));
  renderTasks();
  renderCalendar();
}
function renderTasks() {
  const list = document.getElementById("taskList");
  const query = document.getElementById("search").value.toLowerCase();
  const filterP = document.getElementById("filterPriority").value;
  list.innerHTML = "";
  tasks
    .filter(
      (t) =>
        (!query || t.title.toLowerCase().includes(query)) &&
        (filterP === "All" || t.priority === filterP)
    )
    .forEach((t) => {
      const div = document.createElement("div");
      div.className = "task";
      div.innerHTML = `
          <input type="checkbox" ${
            t.completed ? "checked" : ""
          } onchange="toggleTask('${t.id}')">
          <div class="info">
            <div class="title">${t.title}</div>
            <div class="meta">${t.topic} • ${t.category} • ${
        t.priority
      } • Due ${t.deadline}</div>
          </div>
          <div>
            <button onclick="editTask('${t.id}')">Edit</button>
            <button onclick="openNotes('${t.id}')">Notes</button>
            <button onclick="deleteTask('${t.id}')">Delete</button>
          </div>`;
      list.appendChild(div);
    });
}
function openTaskModal() {
  editingTaskId = null;
  document.getElementById("taskForm").reset();
  document.getElementById("taskModal").style.display = "flex";
}
function closeTaskModal() {
  document.getElementById("taskModal").style.display = "none";
}
document.getElementById("taskForm").onsubmit = (e) => {
  e.preventDefault();
  const task = {
    id: editingTaskId || Date.now().toString(),
    title: document.getElementById("taskTitle").value,
    topic: document.getElementById("taskTopic").value,
    category: document.getElementById("taskCategory").value,
    priority: document.getElementById("taskPriority").value,
    deadline: document.getElementById("taskDeadline").value,
    completed: editingTaskId
      ? tasks.find((t) => t.id === editingTaskId).completed
      : false,
    notes: editingTaskId ? tasks.find((t) => t.id === editingTaskId).notes : "",
  };
  if (editingTaskId)
    tasks = tasks.map((t) => (t.id === editingTaskId ? task : t));
  else tasks.push(task);
  saveTasks();
  closeTaskModal();
};
function editTask(id) {
  const t = tasks.find((x) => x.id === id);
  editingTaskId = id;
  document.getElementById("taskTitle").value = t.title;
  document.getElementById("taskTopic").value = t.topic;
  document.getElementById("taskCategory").value = t.category;
  document.getElementById("taskPriority").value = t.priority;
  document.getElementById("taskDeadline").value = t.deadline;
  document.getElementById("taskModal").style.display = "flex";
}
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
}
function toggleTask(id) {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTasks();
}

let notesTaskId = null;
function openNotes(id) {
  const t = tasks.find((x) => x.id === id);
  notesTaskId = id;
  quill.root.innerHTML = t.notes || "";
  document.getElementById("notesModal").style.display = "flex";
}
function closeNotesModal() {
  document.getElementById("notesModal").style.display = "none";
}
function saveNotes() {
  const html = quill.root.innerHTML;
  tasks = tasks.map((t) => (t.id === notesTaskId ? { ...t, notes: html } : t));
  saveTasks();
  closeNotesModal();
}

function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tasks.json";
  a.click();
}
function importTasks(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        tasks = data;
        saveTasks();
      }
    } catch (err) {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  const headers = [
    "id",
    "title",
    "topic",
    "category",
    "priority",
    "deadline",
    "completed",
    "notes",
  ];
  const rows = tasks.map((t) => [
    t.id,
    t.title,
    t.topic,
    t.category,
    t.priority,
    t.deadline,
    t.completed,
    JSON.stringify(t.notes),
  ]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tasks.csv";
  a.click();
}

function importCSV(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/);
    const headers = lines
      .shift()
      .split(",")
      .map((h) => h.replace(/\"/g, ""));
    const data = lines
      .filter((l) => l.trim())
      .map((line) => {
        const values = line
          .match(/\"([^\"]*(?:\"\"[^\"]*)*)\"/g)
          .map((v) => v.slice(1, -1).replace(/\"\"/g, '"'));
        const obj = {};
        headers.forEach((h, i) => (obj[h] = values[i]));
        obj.completed = obj.completed === "true";
        return obj;
      });
    if (Array.isArray(data)) {
      tasks = data;
      saveTasks();
    }
  };
  reader.readAsText(file);
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayStr = d.toISOString().split("T")[0];
    const cell = document.createElement("div");
    cell.className = "day";
    cell.textContent = d.toDateString().slice(0, 10);
    const dueTasks = tasks.filter((t) => t.deadline === dayStr);
    if (dueTasks.length) {
      cell.classList.add("due");
      if (dueTasks.every((t) => t.completed)) cell.classList.add("completed");
      cell.innerHTML += "<br>" + dueTasks.map((t) => t.title).join(", ");
    }
    grid.appendChild(cell);
  }
}

document.getElementById("search").oninput = renderTasks;
document.getElementById("filterPriority").onchange = renderTasks;
renderTasks();
renderCalendar();
