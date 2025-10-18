
import tkinter as tk
from tkinter import ttk, messagebox

class Athlete:
    def __init__(self, name, athlete_id):
        self.name = name
        self.id = athlete_id

class Event:
    def __init__(self, name):
        self.name = name
        self.scores = {}

    def add_score(self, athlete_id, score):
        self.scores[athlete_id] = score

class GymnasticsScoringSystem:
    def __init__(self):
        self.athletes = {}
        self.events = {}

    def add_athlete(self, name, athlete_id):
        if athlete_id not in self.athletes:
            self.athletes[athlete_id] = Athlete(name, athlete_id)

    def add_event(self, event_name):
        if event_name not in self.events:
            self.events[event_name] = Event(event_name)

    def add_score(self, event_name, athlete_id, score):
        if event_name in self.events and athlete_id in self.athletes:
            self.events[event_name].add_score(athlete_id, score)

    def get_event_scores(self, event_name):
        if event_name in self.events:
            return self.events[event_name].scores

    def get_athlete_score(self, athlete_id):
        total_score = 0
        for event in self.events.values():
            if athlete_id in event.scores:
                total_score += event.scores[athlete_id]
        return total_score

    def get_final_results(self):
        results = {}
        for athlete_id in self.athletes:
            results[athlete_id] = self.get_athlete_score(athlete_id)
        return results

class Application(tk.Tk):
    def __init__(self, scoring_system):
        super().__init__()
        self.scoring_system = scoring_system
        self.title("Gymnastics Scoring System")
        self.geometry("600x400")

        self.create_widgets()

    def create_widgets(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(expand=True, fill='both')

        self.create_athlete_tab()
        self.create_event_tab()
        self.create_score_tab()
        self.create_results_tab()

    def create_athlete_tab(self):
        self.athlete_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.athlete_tab, text="Athletes")

        self.athlete_name_label = ttk.Label(self.athlete_tab, text="Name:")
        self.athlete_name_label.pack(pady=5)
        self.athlete_name_entry = ttk.Entry(self.athlete_tab)
        self.athlete_name_entry.pack(pady=5)

        self.athlete_id_label = ttk.Label(self.athlete_tab, text="ID:")
        self.athlete_id_label.pack(pady=5)
        self.athlete_id_entry = ttk.Entry(self.athlete_tab)
        self.athlete_id_entry.pack(pady=5)

        self.add_athlete_button = ttk.Button(self.athlete_tab, text="Add Athlete", command=self.add_athlete)
        self.add_athlete_button.pack(pady=5)

    def create_event_tab(self):
        self.event_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.event_tab, text="Events")

        self.event_name_label = ttk.Label(self.event_tab, text="Event Name:")
        self.event_name_label.pack(pady=5)
        self.event_name_entry = ttk.Entry(self.event_tab)
        self.event_name_entry.pack(pady=5)

        self.add_event_button = ttk.Button(self.event_tab, text="Add Event", command=self.add_event)
        self.add_event_button.pack(pady=5)

    def create_score_tab(self):
        self.score_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.score_tab, text="Scores")

        self.event_select_label = ttk.Label(self.score_tab, text="Select Event:")
        self.event_select_label.pack(pady=5)
        self.event_select = ttk.Combobox(self.score_tab, values=list(self.scoring_system.events.keys()))
        self.event_select.pack(pady=5)

        self.athlete_select_label = ttk.Label(self.score_tab, text="Select Athlete:")
        self.athlete_select_label.pack(pady=5)
        self.athlete_select = ttk.Combobox(self.score_tab, values=list(self.scoring_system.athletes.keys()))
        self.athlete_select.pack(pady=5)

        self.score_label = ttk.Label(self.score_tab, text="Score:")
        self.score_label.pack(pady=5)
        self.score_entry = ttk.Entry(self.score_tab)
        self.score_entry.pack(pady=5)

        self.add_score_button = ttk.Button(self.score_tab, text="Add Score", command=self.add_score)
        self.add_score_button.pack(pady=5)

    def create_results_tab(self):
        self.results_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.results_tab, text="Results")

        self.results_text = tk.Text(self.results_tab)
        self.results_text.pack(expand=True, fill='both')

        self.show_results_button = ttk.Button(self.results_tab, text="Show Results", command=self.show_results)
        self.show_results_button.pack(pady=5)

    def add_athlete(self):
        name = self.athlete_name_entry.get()
        athlete_id = self.athlete_id_entry.get()
        if name and athlete_id:
            self.scoring_system.add_athlete(name, athlete_id)
            self.athlete_select['values'] = list(self.scoring_system.athletes.keys())
            messagebox.showinfo("Success", f"Athlete {name} added.")
        else:
            messagebox.showwarning("Input Error", "Please enter both name and ID.")

    def add_event(self):
        event_name = self.event_name_entry.get()
        if event_name:
            self.scoring_system.add_event(event_name)
            self.event_select['values'] = list(self.scoring_system.events.keys())
            messagebox.showinfo("Success", f"Event {event_name} added.")
        else:
            messagebox.showwarning("Input Error", "Please enter an event name.")

    def add_score(self):
        event_name = self.event_select.get()
        athlete_id = self.athlete_select.get()
        score = self.score_entry.get()
        if event_name and athlete_id and score:
            try:
                score = float(score)
                self.scoring_system.add_score(event_name, athlete_id, score)
                messagebox.showinfo("Success", f"Score {score} added for athlete {athlete_id} in event {event_name}.")
            except ValueError:
                messagebox.showwarning("Input Error", "Please enter a valid score.")
        else:
            messagebox.showwarning("Input Error", "Please select event, athlete, and enter score.")

    def show_results(self):
        results = self.scoring_system.get_final_results()
        self.results_text.delete(1.0, tk.END)
        for athlete_id, score in results.items():
            athlete_name = self.scoring_system.athletes[athlete_id].name
            self.results_text.insert(tk.END, f"{athlete_name} (ID: {athlete_id}) - Total Score: {score}\n")

if __name__ == "__main__":
    scoring_system = GymnasticsScoringSystem()
    app = Application(scoring_system)
    app.mainloop()


