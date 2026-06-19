import { playerImage } from "./MLBGameDetailsUtils"

export function PlayerHeadshot({
  id,
  name = "",
  className,
}: {
  id?: number
  name?: string
  className: string
}) {
  if (!id) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-xs font-bold text-gray-400 ${className}`}>
        TBD
      </div>
    )
  }

  return <img src={playerImage(id)} alt={name} className={className} />
}
