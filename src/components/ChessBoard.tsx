"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, Frown, Handshake, ShieldAlert } from "lucide-react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { Key } from "@lichess-org/chessground/types";
import { sounds } from "@/lib/sounds";

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
  onMove: (payload: { fromRow: number; fromCol: number; toRow: number; toCol: number; promotion?: string }) => void;
};

const PIECE_SYMBOLS: Record<string, { white: string; black: string; value: number }> = {
  queen: { white: "♕", black: "♛", value: 9 },
  rook: { white: "♖", black: "♜", value: 5 },
  bishop: { white: "♗", black: "♝", value: 3 },
  knight: { white: "♘", black: "♞", value: 3 },
  pawn: { white: "♙", black: "♟", value: 1 },
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

function computeCapturedPieces(board: (ChessPiece | null)[][]) {
  const currentCounts: { white: Record<string, number>; black: Record<string, number> } = {
    white: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 },
    black: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 },
  };

  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type in currentCounts[cell.color]) {
        currentCounts[cell.color][cell.type]++;
      }
    }
  }

  const startingCounts: Record<string, number> = {
    queen: 1,
    rook: 2,
    bishop: 2,
    knight: 2,
    pawn: 8,
  };

  const capturedByWhite: Array<{ type: string; symbol: string; value: number }> = [];
  const capturedByBlack: Array<{ type: string; symbol: string; value: number }> = [];

  for (const [type, count] of Object.entries(startingCounts)) {
    const missingBlack = Math.max(0, count - (currentCounts.black[type] ?? 0));
    for (let i = 0; i < missingBlack; i++) {
      capturedByWhite.push({ type, symbol: PIECE_SYMBOLS[type]?.black ?? "", value: PIECE_SYMBOLS[type]?.value ?? 0 });
    }
    const missingWhite = Math.max(0, count - (currentCounts.white[type] ?? 0));
    for (let i = 0; i < missingWhite; i++) {
      capturedByBlack.push({ type, symbol: PIECE_SYMBOLS[type]?.white ?? "", value: PIECE_SYMBOLS[type]?.value ?? 0 });
    }
  }

  const whiteVal = capturedByWhite.reduce((acc, p) => acc + p.value, 0);
  const blackVal = capturedByBlack.reduce((acc, p) => acc + p.value, 0);

  return { capturedByWhite, capturedByBlack, diff: whiteVal - blackVal };
}

function buildConfig(
  props: ChessBoardProps,
  onMoveRef: React.MutableRefObject<ChessBoardProps["onMove"]>,
  onRequestPromotion: (move: { fromRow: number; fromCol: number; toRow: number; toCol: number }) => void
): Config {
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
          const movingPiece = board[from.row]?.[from.col];
          const destPiece = board[to.row]?.[to.col];

          const isPawnPromotion =
            movingPiece?.type === "pawn" &&
            ((movingPiece.color === "white" && to.row === 0) ||
              (movingPiece.color === "black" && to.row === 7));

          if (isPawnPromotion) {
            onRequestPromotion({
              fromRow: from.row,
              fromCol: from.col,
              toRow: to.row,
              toCol: to.col,
            });
            return;
          }

          if (destPiece) {
            sounds.playCapture();
          } else {
            sounds.playChessMove();
          }

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
    viewOnly: !Boolean(playerColor),
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

  const [pendingPromotion, setPendingPromotion] = useState<{
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
  } | null>(null);

  // Play check sound when check state activates
  useEffect(() => {
    if (props.isCheck && !props.isCheckmate) {
      sounds.playCheck();
    }
  }, [props.isCheck, props.isCheckmate]);

  // Init: create Chessground once, deferred to ensure layout
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let ground: Api | null = null;
    let ro: ResizeObserver | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0) {
        requestAnimationFrame(init);
        return;
      }
      const config = configRef.current ?? buildConfig(props, onMoveRef, setPendingPromotion);
      ground = Chessground(containerRef.current, config);
      groundRef.current = ground;

      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          groundRef.current?.redrawAll();
        });
        ro.observe(containerRef.current);
      }
    };

    requestAnimationFrame(init);

    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      if (ground) {
        ground.destroy();
      } else if (groundRef.current) {
        groundRef.current.destroy();
      }
      groundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Update: reconfigure when props change
  useEffect(() => {
    if (!groundRef.current) return;
    const config = buildConfig(props, onMoveRef, setPendingPromotion);
    configRef.current = config;
    groundRef.current.set(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
  ]);

  const { capturedByWhite, capturedByBlack, diff } = computeCapturedPieces(board);
  const gameOver = props.isCheckmate || props.isDraw || props.winner !== null;

  const handleSelectPromotion = (pieceType: string) => {
    if (!pendingPromotion) return;
    sounds.playChessMove();
    onMoveRef.current({
      ...pendingPromotion,
      promotion: pieceType,
    });
    setPendingPromotion(null);
  };

  const topCaptured = playerColor === "black" ? capturedByBlack : capturedByWhite;
  const bottomCaptured = playerColor === "black" ? capturedByWhite : capturedByBlack;
  const scoreBadgeTop = playerColor === "black" ? (diff < 0 ? `+${Math.abs(diff)}` : null) : (diff > 0 ? `+${diff}` : null);
  const scoreBadgeBottom = playerColor === "black" ? (diff > 0 ? `+${diff}` : null) : (diff < 0 ? `+${Math.abs(diff)}` : null);

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Status Bar */}
      <div className="mb-3 text-center">
        {gameOver ? (
          <span className="rounded-full bg-amber-400/20 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            {props.winner
              ? props.winner === props.playerColor
                ? <span className="flex items-center gap-2"><PartyPopper size={18} className="text-accent" /> بُردی! کیش و مات</span>
                : <span className="flex items-center gap-2"><Frown size={18} className="text-muted/60" /> باختی (مات شدی)</span>
              : <span className="flex items-center gap-2"><Handshake size={18} className="text-muted/60" /> مساوی شد</span>}
          </span>
        ) : props.isCheck ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-4 py-1 text-xs font-bold text-red-300 ring-1 ring-red-500/40 animate-pulse">
            <ShieldAlert size={14} />
            کیش!
          </span>
        ) : props.currentPlayer === props.playerColor ? (
          <span className="flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-4 py-1 text-xs font-bold text-yellow-300 ring-1 ring-yellow-400/40 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
            نوبت شماست! ({props.currentPlayer === "white" ? "سفید" : "سیاه"})
          </span>
        ) : (
          <span className="text-xs text-muted/70">
            نوبت {props.currentPlayer === "white" ? "سفید" : "سیاه"}
          </span>
        )}
      </div>

      {/* Opponent pieces captured */}
      <div className="mb-1 flex items-center justify-between w-full px-2 text-xs">
        <div className="flex items-center gap-1 text-base leading-none select-none tracking-tight">
          {topCaptured.map((p, i) => (
            <span key={i} className="opacity-80">{p.symbol}</span>
          ))}
          {scoreBadgeTop && (
            <span className="text-[10px] font-bold text-muted ml-1">{scoreBadgeTop}</span>
          )}
        </div>
        <span className="text-[11px] text-muted">
          {playerColor === "black" ? "سفید" : "سیاه"}
        </span>
      </div>

      {/* Board */}
      <div
        className="w-full max-w-[min(100%,450px)] aspect-square relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 mx-auto select-none"
        style={{ touchAction: "none" }}
      >
        <div
          ref={containerRef}
          className="cg-wrap cg-board-wrap w-full h-full"
          style={{ touchAction: "none" }}
        />

        {/* Promotion Dialog */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-panel-deep p-4 text-center shadow-2xl">
              <p className="text-sm font-bold text-on-surface mb-3">ارتقای پیاده به:</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: "queen", symbol: playerColor === "black" ? "♛" : "♕", label: "وزیر" },
                  { type: "knight", symbol: playerColor === "black" ? "♞" : "♘", label: "اسب" },
                  { type: "rook", symbol: playerColor === "black" ? "♜" : "♖", label: "رخ" },
                  { type: "bishop", symbol: playerColor === "black" ? "♝" : "♗", label: "فیل" },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleSelectPromotion(item.type)}
                    className="flex flex-col items-center justify-center rounded-xl bg-white/10 p-2.5 hover:bg-accent/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="text-3xl leading-none">{item.symbol}</span>
                    <span className="mt-1 text-[10px] text-muted">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My pieces captured */}
      <div className="mt-2 flex items-center justify-between w-full px-2 text-xs">
        <span className="text-[11px] text-muted">
          {props.playerColor != null
            ? `شما: ${props.playerColor === "white" ? "سفید ♔" : "سیاه ♚"}`
            : "تماشاچی"}
        </span>
        <div className="flex items-center gap-1 text-base leading-none select-none tracking-tight">
          {bottomCaptured.map((p, i) => (
            <span key={i} className="opacity-80">{p.symbol}</span>
          ))}
          {scoreBadgeBottom && (
            <span className="text-[10px] font-bold text-muted ml-1">{scoreBadgeBottom}</span>
          )}
        </div>
      </div>
    </div>
  );
}