"use client";

import { useEffect, useRef } from "react";
import { PartyPopper, Frown, Handshake } from "lucide-react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { Key } from "@lichess-org/chessground/types";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

type ChessPiece = {
  type: string;
  color: "white" | "black";
};

type ChessBoardProps = {
  board: (ChessPiece | null)[][];
  currentPlayer: "white" | "black";
  currentUserId: string;
  playerColor: "white" | "black" | null;
  isCheck: boolean;
  isCheckmate: boolean;
  winner: string | null;
  isDraw: boolean;
  isWaiting: boolean;
  legalMoves?: Record<string, string[]>;
  moveHistory?: Array<{ fromRow: number; fromCol: number; toRow: number; toCol: number }>;
  onMove: (payload: { fromRow: number; fromCol: number; toRow: number; toCol: number }) => void;
};

const PIECE_TO_FEN: Record<string, string> = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
};

function boardToFen(board: (ChessPiece | null)[][]) {
  return board
    .map((row) => {
      let empty = 0;
      let str = "";
      for (const piece of row) {
        if (piece) {
          if (empty > 0) {
            str += empty;
            empty = 0;
          }
          const c = PIECE_TO_FEN[piece.type] ?? "p";
          str += piece.color === "white" ? c.toUpperCase() : c;
        } else {
          empty++;
        }
      }
      if (empty > 0) str += empty;
      return str;
    })
    .join("/");
}

function keyToRc(key: Key) {
  return {
    row: 8 - parseInt(key[1]),
    col: key.charCodeAt(0) - 97,
  };
}

function rcToKey(row: number, col: number): Key {
  return `${String.fromCharCode(97 + col)}${8 - row}` as Key;
}

function buildConfig(props: ChessBoardProps, onMoveRef: React.MutableRefObject<ChessBoardProps["onMove"]>): Config {
  const {
    board,
    currentPlayer,
    playerColor,
    isCheck,
    isCheckmate,
    winner,
    isDraw,
    isWaiting,
    legalMoves,
    moveHistory,
  } = props;

  const gameOver = isCheckmate || isDraw || winner !== null;
  const isMyTurn = Boolean(playerColor) && playerColor === currentPlayer && !isWaiting && !gameOver;

  const dests = new Map<Key, Key[]>();
  if (legalMoves && isMyTurn) {
    for (const [orig, targets] of Object.entries(legalMoves)) {
      dests.set(orig as Key, targets as Key[]);
    }
  }

  const lastMoveEntry = moveHistory?.[moveHistory.length - 1];
  const lastMove = lastMoveEntry
    ? [rcToKey(lastMoveEntry.fromRow, lastMoveEntry.fromCol), rcToKey(lastMoveEntry.toRow, lastMoveEntry.toCol)]
    : undefined;

  const fen = boardToFen(board) + " " + (currentPlayer === "white" ? "w" : "b");

  return {
    fen,
    orientation: playerColor === "black" ? "black" : "white",
    turnColor: currentPlayer,
    check: isCheck ? currentPlayer : false,
    lastMove,
    movable: {
      free: false,
      color: playerColor ?? "white",
      dests: isMyTurn ? dests : new Map(),
      showDests: isMyTurn,
      events: {
        after: (orig: Key, dest: Key) => {
          const from = keyToRc(orig);
          const to = keyToRc(dest);
          onMoveRef.current({
            fromRow: from.row,
            fromCol: from.col,
            toRow: to.row,
            toCol: to.col,
          });
        },
      },
    },
    animation: { enabled: true, duration: 200 },
    highlight: { lastMove: true, check: true },
    coordinates: true,
    viewOnly: false,
    draggable: { enabled: isMyTurn },
    selectable: { enabled: isMyTurn },
  };
}

export default function ChessBoard(props: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<Api | null>(null);
  const onMoveRef = useRef(props.onMove);
  onMoveRef.current = props.onMove;
  const configRef = useRef<Config | null>(null);

  // Init: create Chessground once, deferred to ensure layout
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let ground: Api | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.getBoundingClientRect();
      const config = configRef.current ?? buildConfig(props, onMoveRef);
      ground = Chessground(containerRef.current, config);
      groundRef.current = ground;
    };

    requestAnimationFrame(init);

    return () => {
      cancelled = true;
      if (ground) {
        ground.destroy();
      } else if (groundRef.current) {
        groundRef.current.destroy();
      }
      groundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update: reconfigure when props change
  useEffect(() => {
    if (!groundRef.current) return;
    const config = buildConfig(props, onMoveRef);
    configRef.current = config;
    groundRef.current.set(config);
  }, [
    props.board,
    props.currentPlayer,
    props.playerColor,
    props.isCheck,
    props.isCheckmate,
    props.winner,
    props.isDraw,
    props.isWaiting,
    props.legalMoves,
    props.moveHistory,
  ]);

  const gameOver = props.isCheckmate || props.isDraw || props.winner !== null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-3 text-center">
        {gameOver ? (
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
            {props.winner
              ? props.winner === props.playerColor
                ? <span className="flex items-center gap-2"><PartyPopper size={20} className="text-accent" /> بُردی!</span>
                : <span className="flex items-center gap-2"><Frown size={20} className="text-muted/60" /> باختی</span>
              : <span className="flex items-center gap-2"><Handshake size={20} className="text-muted/60" /> مساوی شد</span>}
          </span>
        ) : props.isCheck ? (
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
            کیش!
          </span>
        ) : props.currentPlayer === props.playerColor ? (
          <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
            نوبت توئه! ({props.currentPlayer === "white" ? "سفید" : "سیاه"})
          </span>
        ) : (
          <span className="text-xs text-muted">
            نوبت {props.currentPlayer === "white" ? "سفید" : "سیاه"}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="cg-wrap cg-board-wrap"
      />

      <div className="mt-1 text-[10px] text-muted">
        {props.playerColor != null
          ? `تو: ${props.playerColor === "white" ? "سفید ♔" : "سیاه ♚"}`
          : "داری نگاش میکنی"}
      </div>
    </div>
  );
}