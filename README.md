# JOJI STATS

A baseball stats tracking web app built for amateur/recreational teams. Players and managers can record games in real time, view batting and pitching statistics, and manage rosters across multiple seasons.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Routing | React Router v7 |
| Database / Auth | Supabase (PostgreSQL + Row Level Security) |
| Hosting | Vercel |

---

## Features

- **Live game recording** — Record at-bats and pitching appearances play-by-play with real-time base state, outs, and score tracking
- **Undo support** — Step back through plays and fully restore game state
- **Auto draft saving** — Game progress is saved to localStorage automatically so nothing is lost on refresh
- **Batting stats** — AVG, OBP, SLG, OPS, ISO, BB/K, HR, RBI, and more
- **Pitching stats** — ERA, WHIP, IP, SO, and per-game breakdowns
- **Performance trends** — Charts showing per-game stat progression over a season
- **Multi-season rosters** — Players are scoped to a season year; roster can be copied forward to a new season
- **Role-based access** — Four roles (admin, manager, recorder, player) with Supabase RLS enforcing per-row permissions
- **Team management** — Create, edit, and archive teams
- **Player management** — Jersey numbers, positions, season-year tracking, archiving
- **Contact form** — In-app contact / feedback submission
- **Season archive** — Browse historical seasons

---

## Architecture

All data lives in Supabase. The frontend calls Supabase directly via the JS client — no intermediate API server.

```
Browser (React)
    ↓ supabase-js
Supabase (PostgreSQL)
  tables: teams, players, games,
          batting_game_stats, pitching_game_stats,
          user_access
```

### Key database design decisions

- `innings_pitched_outs` stores innings pitched as a raw out count (e.g. 7 outs = 2.1 IP). This avoids floating-point rounding errors when calculating ERA and allows exact arithmetic.
- `batting_game_stats` and `pitching_game_stats` are separate tables joined to `games`, not embedded columns. This allows a player to have a batting entry and a pitching entry in the same game independently.
- `user_access` maps an email to a `(team_id, player_id, role)` triple. Supabase RLS policies use this to restrict which rows each user can read or write.

> **Note:** The repo also contains `joji-stats-api/` — an Express + MySQL backend that was the original write layer. It was replaced by direct Supabase writes before it was ever used in production. It is now dead code.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the tables described below

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd JojiStats-Front

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in your Supabase credentials:
#   VITE_SUPABASE_URL=your_supabase_project_url
#   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Start the development server
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Database Tables

| Table | Description |
|---|---|
| `teams` | Team info and current season year |
| `players` | Player roster per team and season year |
| `games` | Game records (date, opponent, score, result) |
| `batting_game_stats` | Per-game batting stats linked to a player and game |
| `pitching_game_stats` | Per-game pitching stats linked to a player and game |
| `user_access` | Maps a user email to a `(team_id, player_id, role)` triple for RLS |

---

## What I Learned

Through this project, I learned that building a real application requires more than writing code. Before working on JojiStats, I thought application development mainly meant creating features and making them work. However, through this project, I learned that a complete application also requires planning, design, data structure, user flow, testing, and continuous improvement.

One of the most important lessons I learned was the importance of planning before coding. At the beginning of the project, I wanted to start building features right away. However, as the application became more complex, I realized that database design, screen layout, and user flow needed to be planned carefully. If these parts are not clear, the development process becomes more difficult later. This helped me understand why software development often begins with requirements, design, and system planning before implementation.

I also learned that frontend, backend, authentication, and database design cannot be treated as completely separate parts. React was used to create the user interface, Supabase was used to store and manage data, and authentication was used to control access to the system. By connecting these parts, I gained a better understanding of how a modern web application works as one complete system.

Another important lesson was that UI/UX design is part of the functionality of an application. While using Figma, I realized that a screen can technically work but still feel difficult or confusing to use. If the layout is not clear, users may not know where to look or what action to take next. Good design helps users understand the system, reduces confusion, and makes the application feel more reliable.

Testing with real data also changed the way I think about application development. Using actual data from the baseball team I belong to helped me notice problems that were not clear when using only sample data. I learned that a real application needs to handle incomplete records, corrections, different user roles, and season-based organization. This taught me that software should be designed not only to work correctly in a demo, but also to support real situations and real users.

Role-based access control helped me understand that software must adapt to different types of users. Players, recorders, managers, and admins all need different experiences and permissions. This made me think more carefully about responsibility, security, and how the application should guide each user based on their role.

This project also helped me develop a stronger product mindset. I learned that adding more features does not always make an application better. A useful product should focus on the real problems of its users. For JojiStats, this meant focusing on how amateur baseball teams can record games, review player performance, and understand individual contributions more easily.

Finally, this project gave me confidence. I started with many technologies that were new to me, and there were many moments when I was unsure how to continue. However, by researching, testing, fixing errors, redesigning screens, and improving the application step by step, I was able to turn an idea into a working project. This experience taught me that learning unfamiliar technologies is difficult, but possible when I break the process into smaller steps and continue improving.

Overall, JojiStats helped me grow not only as a programmer but also as a problem solver. I learned that software development is a process of understanding people, designing systems, solving technical problems, and improving the product over time.

---

## What Was Hard

One of the biggest challenges was designing a database structure that could correctly handle teams, players, games, seasons, individual statistics, and user access. At first, it was difficult to understand how each type of data should be connected. For example, one team can have many players, one game can include many player records, and each player can have both batting and pitching statistics across multiple games and seasons. Because of this, I had to think carefully about how the tables should relate to each other and how the data should be stored without becoming confusing or duplicated.

Another major challenge was making baseball statistics easy to record. Baseball data can become complicated quickly because a single game includes many players, different batting results, pitching changes, game results, and season-based records. I had to design the input process so that users could enter data without feeling overwhelmed. This showed me that a useful application needs not only a good database, but also a clear and efficient workflow for users.

Connecting the frontend with Supabase was also challenging. In some cases, queries did not return the expected results because of table permissions or row-level security settings. This made debugging difficult because the issue was not always obvious from the frontend. Through this process, I learned that authentication state, database policies, table permissions, and query logic all need to be checked together when working with Supabase.

Design was another important challenge. I used Figma to design the screens before implementing them, but my early designs looked too simple and did not always feel professional. Some screens were also difficult to understand from a user's perspective. I had to improve the layout, spacing, button placement, colors, and information hierarchy so that the screens were easier to understand and use.

React and TypeScript also created technical challenges. At first, it was difficult to understand how to divide the application into components and manage data across different screens. I sometimes tried to put too much code in one place, which made the application harder to maintain. TypeScript was also difficult because it required me to define the shape of the data clearly. Many errors appeared during development, but fixing them helped me organize the code more safely.

Role-based access control was another challenge because different types of users needed different permissions. Players need to view their own pages, recorders need to enter game data, managers need to review team information, and admins need broader access. Designing this system required me to think about the application as a system with different users, responsibilities, and levels of access.

Testing JojiStats with real data from the baseball team I belong to also revealed challenges that were not obvious with sample data. I realized that data entry speed is very important — baseball records include many fields, so the input screen needs to be simple and efficient. Real data is also not always complete or perfect. Some records may be missing, entered incorrectly, or need to be edited later. This taught me that a real application needs to be not only functional, but also fast, clear, and flexible.

Overall, the most difficult part of this project was not just learning each tool separately, but understanding how all of these parts — database design, frontend development, authentication, user access control, and UI/UX design — work together to create one complete application.

**Main challenges:**
- Designing relational database tables for teams, players, games, statistics, seasons, and user access
- Connecting React with Supabase
- Debugging Supabase permissions and row-level security issues
- Managing user authentication
- Handling team-based and player-based data
- Testing the application with real team data
- Improving data entry speed and usability
- Handling missing, corrected, or updated records
- Creating a simple and understandable UI for complex baseball statistics
- Designing screens and improving user experience with Figma
- Learning how to organize React components
- Fixing TypeScript errors and defining data types correctly
- Designing role-based access control

---

## Project Structure

```
JojiStats-Front/
├── src/
│   ├── api/
│   │   ├── api.ts              # write operations (Supabase)
│   │   ├── supabase-api.ts     # read operations (Supabase)
│   │   └── supabase-client.ts  # Supabase client init
│   ├── components/             # UI components + feature hooks
│   │   ├── useGameMode.ts      # live game orchestrator hook
│   │   ├── useLiveLineup.ts
│   │   ├── useLiveGameDraft.ts
│   │   ├── useLivePlayEditor.ts
│   │   ├── useRunnerControls.ts
│   │   ├── RecordGamePage.utils.ts  # state transition logic
│   │   └── RecordGamePage.types.ts  # domain types for live game
│   ├── hooks/
│   │   └── useGameStats.ts     # stat aggregation hook
│   ├── pages/                  # route-level page components
│   └── types.ts                # shared domain types
└── joji-stats-api/             # (unused) Express + MySQL backend
```
