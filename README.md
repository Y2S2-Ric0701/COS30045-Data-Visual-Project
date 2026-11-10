# Hospitalised Injuries from Road Crashes in Australia

> **Unit:** COS20031 – Database Design Project  
> **Group:** Data Vis Project (2026 S2)_Group 9  
> **Institution:** Swinburne University of Technology Sarawak Campus  

---

## 🚀 Live Deployment

<!-- Replace the placeholder URL once deployed -->
🔗 **[View the project on Vercel](https://data-vis-project-2026-s2-group-9.vercel.app)**

---

## Project Schedule
**[Link to spreadsheet](https://swinburnesarawak-my.sharepoint.com/:x:/g/personal/100072258_students_swinburne_edu_my/IQA3ZuMv2flySJ9Yvy6gwQP7AaJ9KHYxvT6Z9abGFdHKlfg?e=q6GIGd)**

---

## UI/UX
**[Miro](https://miro.com/app/board/uXjVHjSgSDE=/)**

---

## 👥 Team Members

| Name | Student ID | Role & Contribution |
| :--- | :--- | :--- |
| **Amberlyn Xi En LIM**<br>*(Group Leader)* | 104391342 | **UI/UX Design, Storytelling & Usability Lead**<br>• **Narrative & Wireframes:** Design the explanatory story arc (following storytelling principles like Knaflic), sticky-note storyboards, wireframes, accessible color palettes (color-blind safe), and website annotation text.<br>• **Usability Testing:** Plan, conduct, and document usability evaluation sessions with target users.<br>• **Design Book Sections:** Author **Section 1 (Introduction & Purpose)**, **Section 4 (Visualisation & Webpage Design)**, **Section 6 (Usability Evaluation & Accessibility)**, and **Section 7 (APA References)**.<br>• **D3 Implementation:** Code or assist with coding one interactive D3 element or component (e.g., filter buttons, chart annotations, or legends). |
| **Ricardo Zhen Wei CHEW** | 104392756 | **Data Analytics & KNIME Lead**<br>• **KNIME Data Pipeline:** Build, clean, transform, and document the data workflow (`.knwf` file) for the Hospitalised Injuries dataset. Perform required table joins, aggregation, derived metrics, and export clean JSON/CSV files ready for D3 loading.<br>• **Design Book Sections:** Author **Section 2 (Data Processing & Governance)** and **Section 3 (Exploratory Data Analysis)**. Detail data quality issues, privacy considerations, ethics, and initial statistical distributions.<br>• **D3 Implementation:** Code at least one core analytical chart in D3.js (e.g., a multi-series line chart or stacked bar chart with dynamic filters). |
| **Kah Seng CHAI** | 100072258 | **Web Engineering & D3 Interactive Lead**<br>• **Web & Repository Setup:** Set up the shared GitHub repository, HTML/CSS webpage layout, responsive SVG containers, and live deployment on Vercel.<br>• **D3 Chart Engineering:** Build complex or non-standard interactive D3 visualisations (e.g., connected scatter plots or multi-layered charts with dynamic axes, custom tooltips, and smooth transitions).<br>• **Design Book Sections:** Author **Section 5 (Interactivity Justification)** and write up the technical code architecture and data binding logic. |

---

## 📂 Repository Structure

```
COS30045-Data-Visual-Project/
├── src/
│   ├── index.html                          # Main page – semantic HTML5 layout
│   ├── css/
│   │   ├── base.css                        # Reset, typography & component styles
│   │   └── visualisations.css              # SVG container, axes & tooltip styles
│   ├── js/
│   │   ├── shared-constants.js             # Colour palettes, margins & dimensions
│   │   ├── load-data.js                    # d3.csv loader with row conversion
│   │   └── main-narrative.js               # Entry point – SVG init & filter wiring
│   └── data/
│       └── sample_hospitalisation_data.csv # Dummy CSV for development
├── knime/                                  # KNIME workflow files (data prep)
├── .gitignore
├── vercel.json                             # Vercel static-site configuration
└── README.md                               # ← You are here
```

---

## 🛠️ Tech Stack

| Layer          | Technology                            |
|----------------|---------------------------------------|
| Markup         | HTML5 (semantic elements)             |
| Styling        | CSS3 (custom properties, responsive)  |
| Scripting      | JavaScript ES6+                       |
| Visualisation  | [D3.js v7](https://d3js.org/) (CDN)   |
| Hosting        | [Vercel](https://vercel.com/)         |

---

## 🖥️ Local Preview

Since this is a **static site** with no build step, you can serve it
locally with any HTTP server. D3's `d3.csv()` requires HTTP (not `file://`), so a server is needed.

### Option 1 – Python (pre-installed on macOS)

```bash
cd src
python3 -m http.server 8000
# → open http://localhost:8000
```

### Option 2 – Node / npx

```bash
npx -y serve src
# → open the URL printed in the terminal
```

### Option 3 – VS Code Live Server

Install the **Live Server** extension, right-click `src/index.html`, and
select *"Open with Live Server"*.

---

## 📊 Data Sources

- **AIHW** – [Hospitalised injury due to land transport crashes](https://www.aihw.gov.au/reports/injury/hospitalised-injury-due-to-land-transport-crashes)
- **BITRE** – [Road Deaths Australia – Annual Summaries](https://www.bitre.gov.au/publications/ongoing/road_deaths_australia_annual_summaries)

---

## 📝 Licence

This project is developed for educational purposes as part of COS20031 Database Design Project by Data Vis Project (2026 S2)_Group 9 at Swinburne University of Technology Sarawak Campus.