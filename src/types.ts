export type Stat = {
  label: string
  value: string
}

export type TrendPoint = {
  game: string
  avg: string
}

export type Player = {
  name: string
  position: string
  stats: Stat[]
  avgTrend: TrendPoint[]
}

export type SetActiveIndex = React.Dispatch<React.SetStateAction<number>>