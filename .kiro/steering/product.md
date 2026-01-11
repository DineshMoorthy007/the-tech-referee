# Project Name: The Tech Referee

## 1. Project Overview
"The Tech Referee" is an intelligent decision-support tool designed to help developers and architects choose between competing technologies. Unlike standard search or chat tools, it focuses on **trade-offs, constraints, and "hidden taxes."**

## 2. Core Value Proposition
We do not provide "answers"; we provide "verdicts based on context." We help users move from "Analysis Paralysis" to "Informed Decision" by simulating how choices play out in different scenarios.

## 3. Key Features to Build
1.  **The Matchup Input:** A clean interface where users enter two competing technologies (e.g., "Postgres vs. MongoDB") and optional constraints.
2.  **The Tale of the Tape (Visual Matrix):** A dynamic comparison table that highlights Speed, Cost, and Developer Experience.
3.  **Scenario Toggles:** Interactive elements to switch the verdict between "Startup Mode" (Speed), "Enterprise Mode" (Scale), and "Budget Mode" (Cost).
4.  **The "Tax" Warning:** A prominent UI component that alerts the user to the specific downside of their choice.

## 4. Technical Stack
* **Frontend:** [Insert your choice, e.g., Next.js, React, or simple HTML/CSS]
* **Styling:** [Insert your choice, e.g., Tailwind CSS]
* **Logic:** The decision logic is driven by the prompt engineering defined in `referee_guidelines.md`.

## 5. Design Principles
* **Objective:** The UI should feel like a scoreboard or a legal document—clean, high-contrast, and neutral.
* **Scannable:** Users should be able to see the "Winner" and the "Tax" in under 5 seconds.