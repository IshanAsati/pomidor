import { Task, TaskFilters, Elements } from '../types/index.js';
import { generateId } from '../utils/time.js';
import { saveTasks, loadTasks } from '../utils/storage.js';
import { sanitizeTaskText, validatePriority, sanitizeCategory, isRateLimited } from '../utils/validation.js';
import { showTaskCompleteNotification } from '../utils/notifications.js';

/**
 * Task Manager component class
 */
export class TaskManager {
  private tasks: Task[] = [];
  private elements: Elements;
  private filters: TaskFilters = {};

  constructor(elements: Elements) {
    this.elements = elements;
    this.loadTasks();
    this.bindEvents();
    this.render();
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    // Add task button
    this.elements.buttons.addTask?.addEventListener('click', () => {
      this.addTaskFromInput();
    });

    // Enter key in task input
    this.elements.inputs.newTask?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTaskFromInput();
      }
    });

    // Clear tasks button
    this.elements.buttons.clearTasks?.addEventListener('click', () => {
      this.clearCompletedTasks();
    });
  }

  /**
   * Add task from input fields
   */
  private addTaskFromInput(): void {
    if (isRateLimited('add-task', 500)) {
      return; // Prevent spam
    }

    const taskInput = this.elements.inputs.newTask;
    const priorityInput = this.elements.inputs.priority;
    const categoryInput = this.elements.inputs.category;

    if (!taskInput || !taskInput.value.trim()) {
      return;
    }

    const taskText = sanitizeTaskText(taskInput.value);
    const priority = validatePriority(priorityInput?.value || 'medium');
    const category = sanitizeCategory(categoryInput?.value || '');

    if (taskText.length === 0) {
      this.showError('Task text cannot be empty');
      return;
    }

    const task: Task = {
      id: generateId(),
      text: taskText,
      completed: false,
      priority,
      category: category || undefined,
      createdAt: new Date(),
      completedAt: undefined
    };

    this.addTask(task);

    // Clear inputs
    taskInput.value = '';
    if (categoryInput) categoryInput.value = '';
  }

  /**
   * Add a new task
   */
  public addTask(task: Task): void {
    this.tasks.unshift(task); // Add to beginning
    this.saveTasks();
    this.render();
  }

  /**
   * Complete a task
   */
  public completeTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    task.completed = true;
    task.completedAt = new Date();

    // Show notification
    showTaskCompleteNotification(task.text);

    this.saveTasks();
    this.render();

    // Update statistics
    this.updateStatistics();
  }

  /**
   * Uncomplete a task
   */
  public uncompleteTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !task.completed) return;

    task.completed = false;
    task.completedAt = undefined;

    this.saveTasks();
    this.render();
    this.updateStatistics();
  }

  /**
   * Delete a task
   */
  public deleteTask(taskId: string): void {
    if (isRateLimited('delete-task', 1000)) {
      return; // Prevent accidental multiple deletions
    }

    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveTasks();
    this.render();
  }

  /**
   * Edit a task
   */
  public editTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Validate and sanitize updates
    if (updates.text !== undefined) {
      updates.text = sanitizeTaskText(updates.text);
    }
    if (updates.priority !== undefined) {
      updates.priority = validatePriority(updates.priority);
    }
    if (updates.category !== undefined) {
      updates.category = sanitizeCategory(updates.category);
    }

    Object.assign(task, updates);
    this.saveTasks();
    this.render();
  }

  /**
   * Clear completed tasks
   */
  public clearCompletedTasks(): void {
    if (isRateLimited('clear-tasks', 2000)) {
      return;
    }

    const completedCount = this.tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
      return;
    }

    if (confirm(`Delete ${completedCount} completed task(s)?`)) {
      this.tasks = this.tasks.filter(t => !t.completed);
      this.saveTasks();
      this.render();
    }
  }

  /**
   * Set filters
   */
  public setFilters(filters: TaskFilters): void {
    this.filters = { ...filters };
    this.render();
  }

  /**
   * Get filtered tasks
   */
  private getFilteredTasks(): Task[] {
    return this.tasks.filter(task => {
      if (this.filters.priority && task.priority !== this.filters.priority) {
        return false;
      }
      if (this.filters.category && task.category !== this.filters.category) {
        return false;
      }
      if (this.filters.completed !== undefined && task.completed !== this.filters.completed) {
        return false;
      }
      return true;
    });
  }

  /**
   * Render tasks list
   */
  private render(): void {
    const taskList = this.elements.taskList;
    if (!taskList) return;

    const filteredTasks = this.getFilteredTasks();

    // Clear existing tasks
    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Render each task
    filteredTasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      taskList.appendChild(taskElement);
    });

    // Update empty state visibility
    this.updateEmptyState();
  }

  /**
   * Create task element
   */
  private createTaskElement(task: Task): HTMLElement {
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority}`;
    li.dataset.taskId = task.id;

    if (task.completed) {
      li.classList.add('completed');
    }

    // Task content
    const content = document.createElement('div');
    content.className = 'task-content';

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.text;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    if (task.category) {
      const category = document.createElement('span');
      category.className = 'task-category';
      category.textContent = task.category;
      meta.appendChild(category);
    }

    const priority = document.createElement('span');
    priority.className = `task-priority priority-${task.priority}`;
    priority.textContent = task.priority;
    meta.appendChild(priority);

    content.appendChild(taskText);
    content.appendChild(meta);
    li.appendChild(content);

    // Task buttons
    const buttons = document.createElement('div');
    buttons.className = 'task-buttons';

    // Complete/Uncomplete button
    const completeBtn = document.createElement('button');
    completeBtn.className = 'task-btn complete-btn';
    completeBtn.innerHTML = task.completed ? '↩️' : '✅';
    completeBtn.title = task.completed ? 'Mark as incomplete' : 'Mark as complete';
    completeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      task.completed ? this.uncompleteTask(task.id) : this.completeTask(task.id);
    });

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'task-btn edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit task';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startEditingTask(task.id);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-btn delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this task?')) {
        this.deleteTask(task.id);
      }
    });

    buttons.appendChild(completeBtn);
    buttons.appendChild(editBtn);
    buttons.appendChild(deleteBtn);
    li.appendChild(buttons);

    return li;
  }

  /**
   * Start editing a task
   */
  private startEditingTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
    if (!taskElement) return;

    const taskTextElement = taskElement.querySelector('.task-text') as HTMLElement;
    if (!taskTextElement) return;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'task-edit-input';

    // Replace text with input
    taskTextElement.style.display = 'none';
    taskTextElement.parentNode?.insertBefore(input, taskTextElement);

    input.focus();
    input.select();

    // Handle save
    const saveEdit = () => {
      const newText = input.value.trim();
      if (newText && newText !== task.text) {
        this.editTask(taskId, { text: newText });
      } else {
        // Cancel edit
        input.remove();
        taskTextElement.style.display = '';
      }
    };

    // Handle escape
    const cancelEdit = () => {
      input.remove();
      taskTextElement.style.display = '';
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    const taskList = this.elements.taskList;
    if (!taskList) return;

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-icon">📝</div>
      <p>No tasks yet</p>
      <small>Add your first task to get started</small>
    `;
    taskList.appendChild(emptyState);
  }

  /**
   * Update empty state visibility
   */
  private updateEmptyState(): void {
    // This method can be used to toggle visibility of empty state elements
    // if they exist separately from the task list
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const taskInput = this.elements.inputs.newTask;
    if (taskInput && taskInput.parentNode) {
      taskInput.parentNode.insertBefore(errorDiv, taskInput.nextSibling);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 3000);
    }
  }

  /**
   * Save tasks to storage
   */
  private saveTasks(): void {
    saveTasks(this.tasks);
  }

  /**
   * Load tasks from storage
   */
  private loadTasks(): void {
    this.tasks = loadTasks();
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    const completedTasks = this.tasks.filter(t => t.completed).length;
    
    // Update localStorage for compatibility
    localStorage.setItem('completedTasks', completedTasks.toString());
    
    // Update display
    if (this.elements.statistics.tasks) {
      this.elements.statistics.tasks.textContent = completedTasks.toString();
    }
  }

  /**
   * Get task statistics
   */
  public getStatistics() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const byPriority = {
      high: this.tasks.filter(t => t.priority === 'high').length,
      medium: this.tasks.filter(t => t.priority === 'medium').length,
      low: this.tasks.filter(t => t.priority === 'low').length
    };

    return { total, completed, byPriority };
  }

  /**
   * Get all tasks
   */
  public getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Import tasks
   */
  public importTasks(tasks: Task[]): void {
    // Validate and sanitize imported tasks
    const validTasks = tasks.filter(task => {
      return task.id && task.text && task.createdAt;
    }).map(task => ({
      ...task,
      text: sanitizeTaskText(task.text),
      priority: validatePriority(task.priority),
      category: task.category ? sanitizeCategory(task.category) : undefined,
      createdAt: new Date(task.createdAt),
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined
    }));

    this.tasks = validTasks;
    this.saveTasks();
    this.render();
  }

  /**
   * Export tasks
   */
  public exportTasks(): Task[] {
    return this.getTasks();
  }
}