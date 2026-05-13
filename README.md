# JojiStats

A baseball statistics management web application for amateur baseball teams.

## Overview

JojiStats allows teams to manage rosters, record games, and track individual batting and pitching statistics. Players and coaches can view performance data by game, player, or season.

## Features

- User authentication (Supabase Auth)
- Team and player roster management
- Game recording with batting and pitching stats
- Individual and team statistics dashboard
- Season archive
- Role-based access (player, recorder, manager, admin)

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend / Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## Getting Started

1. Clone the repo
2. Install dependencies

```bash
npm install
```

3. Create a `.env.local` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the dev server

```bash
npm run dev
```

## Database Tables

| Table | Description |
|-------|-------------|
| `teams` | Team info and current season year |
| `players` | Player roster per team and season |
| `games` | Game records (date, opponent, score, result) |
| `batting_game_stats` | Per-game batting stats for each player |
| `pitching_game_stats` | Per-game pitching stats for each player |
| `user_access` | Role assignments per user |
