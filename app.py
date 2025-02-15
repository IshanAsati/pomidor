import tkinter as tk
from tkinter import ttk
import time
import threading
import winsound

class PomodoroTimer:
    def __init__(self, root):
        self.root = root
        self.root.title("Pomodoro Timer")
        self.root.geometry("400x200")
        self.root.configure(bg="#2E3440")
        self.root.attributes("-fullscreen", True)
        self.root.bind("<Escape>", self.exit_fullscreen)

        self.work_time = 25 * 60
        self.short_break_time = 5 * 60
        self.long_break_time = 15 * 60
        self.cycles = 0

        self.timer_label = ttk.Label(self.root, text="25:00", font=("Helvetica", 72), background="#2E3440", foreground="#D8DEE9")
        self.timer_label.pack(expand=True)

        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=300, mode="determinate")
        self.progress.pack(pady=20)

        self.start_button = ttk.Button(self.root, text="Start", command=self.start_timer)
        self.start_button.pack(side="left", padx=10)

        self.reset_button = ttk.Button(self.root, text="Reset", command=self.reset_timer)
        self.reset_button.pack(side="right", padx=10)

        self.running = False
        self.time_left = self.work_time

    def start_timer(self):
        if not self.running:
            self.running = True
            self.start_button.config(state="disabled")
            self.run_timer()

    def reset_timer(self):
        self.running = False
        self.time_left = self.work_time
        self.timer_label.config(text="25:00")
        self.progress["value"] = 0
        self.start_button.config(state="normal")

    def run_timer(self):
        if self.time_left > 0 and self.running:
            mins, secs = divmod(self.time_left, 60)
            self.timer_label.config(text=f"{mins:02}:{secs:02}")
            self.progress["value"] = (self.work_time - self.time_left) / self.work_time * 100
            self.time_left -= 1
            self.root.after(1000, self.run_timer)
        else:
            self.running = False
            self.cycles += 1
            self.progress["value"] = 100
            winsound.Beep(440, 1000)
            if self.cycles % 4 == 0:
                self.time_left = self.long_break_time
            else:
                self.time_left = self.short_break_time
            self.start_button.config(state="normal")
            self.fade_transition()

    def fade_transition(self):
        for i in range(0, 101, 10):
            self.root.attributes("-alpha", i / 100)
            time.sleep(0.05)
        for i in range(100, -1, -10):
            self.root.attributes("-alpha", i / 100)
            time.sleep(0.05)
        self.start_timer()

    def exit_fullscreen(self, event=None):
        self.root.attributes("-fullscreen", False)

if __name__ == "__main__":
    root = tk.Tk()
    app = PomodoroTimer(root)
    root.mainloop()