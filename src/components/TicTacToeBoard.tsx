type TicTacToeBoardProps = {
  board: Array<string | null>;
  currentPlayer: string;
  onMove: (index: number) => void;
  disabled?: boolean;
};

export default function TicTacToeBoard({ board, currentPlayer, onMove, disabled = false }: TicTacToeBoardProps) {
  return (
    <div className="rounded-2xl bg-panel/70 p-4 lg:p-6">
      <div className="mb-3 text-center text-xs lg:text-sm text-muted">
        نوبت: {currentPlayer}
      </div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => onMove(index)}
            disabled={disabled}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl lg:text-4xl font-semibold transition-all ${
              cell === "X" ? "text-accent" : "text-white"
            } ${
              disabled ? "bg-panel/50 text-muted" : "bg-panel-soft active:scale-95"
            }`}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>
    </div>
  );
}
