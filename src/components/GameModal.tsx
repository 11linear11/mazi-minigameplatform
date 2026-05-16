"use client";

import dynamic from "next/dynamic";
import { Trophy, PartyPopper, Handshake, Clock, X } from "lucide-react";
import TicTacToeBoard from "@/components/TicTacToeBoard";
import UnoGame from "@/components/UnoGame";
import LockPickGame from "@/components/LockPickGame";
import DotsAndBoxesBoard from "@/components/DotsAndBoxesBoard";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), { ssr: false });

type GameModalProps = {
  session?: {
    id: string;
    gameType: string;
    status: string;
    meta?: { roomCode?: string };
    hostId?: string;
    players?: Array<{ userId: string; connected?: boolean; username?: string }>;
    minPlayers?: number;
  } | null;
  gameState?: { state?: any; error?: string | null; result?: any; legalMoves?: Record<string, string[]> } | null;
  onMove: (payload: { position: number }) => void;
  onClose: () => void;
  onStart: () => void;
  currentUserId?: string | null;
  onUnoAction: (payload: { type: "draw" | "play"; cardIndex?: number; chosenColor?: string }) => void;
  onChessMove: (payload: { fromRow: number; fromCol: number; toRow: number; toCol: number }) => void;
  onLockPickAction: (payload: any) => void;
  onDotsAndBoxesMove: (payload: { row: number; col: number; orientation: "h" | "v" }) => void;
  onRequestEnd?: () => void;
  endGameRequests?: string[];
  votedToEnd?: boolean;
};

export default function GameModal({
  session,
  gameState,
  onMove,
  onClose,
  onStart,
  currentUserId,
  onUnoAction,
  onChessMove,
  onLockPickAction,
  onDotsAndBoxesMove,
  onRequestEnd,
  endGameRequests = [],
  votedToEnd = false,
}: GameModalProps) {
  if (!session) {
    return null;
  }
  const chessState = session.gameType === "Chess" ? gameState?.state : null;
  const unoState = session.gameType === "Uno" ? gameState?.state : null;
  const tttState = session.gameType === "Tic Tac Toe" ? gameState?.state : null;
  const lockPickState = session.gameType === "LockPick" ? gameState?.state : null;
  const dabState = session.gameType === "Dots & Boxes" ? gameState?.state : null;
  const isFinished = session.status === "finished";
  const isWaiting = session.status !== "active" && !isFinished;
  const isMyTurn = dabState
    ? dabState.players?.[dabState.currentPlayerIndex]?.userId === currentUserId
    : unoState
    ? unoState.players?.[unoState.currentPlayerIndex]?.userId === currentUserId
    : false;
  const canStart =
    session.status === "waiting" &&
    session.hostId === currentUserId &&
    (session.players?.length ?? 0) >= (session.minPlayers ?? 2);

  const result = gameState?.result ?? {};
  const winnerName = result.winnerName;
  const isDraw = result.draw;
  const iAmWinner = result.winner === currentUserId;

  const disconnectedPlayers = (session.players ?? []).filter((p) => !p.connected);

  const renderGame = () => {
    if (tttState) {
      return (
        <div className="flex items-center justify-center h-full w-full p-4">
          <div className="w-full max-w-sm">
            <TicTacToeBoard
              board={tttState.board}
              currentPlayer={tttState.currentPlayer}
              onMove={(position) => onMove({ position })}
              disabled={isWaiting}
            />
          </div>
        </div>
      );
    }
    if (unoState) {
      return (
        <UnoGame
          state={unoState}
          currentUserId={currentUserId ?? ""}
          isMyTurn={isMyTurn}
          isWaiting={isWaiting}
          onAction={onUnoAction}
          playersMeta={session.players}
        />
      );
    }
    if (lockPickState) {
      return (
        <div className="flex items-center justify-center h-full w-full p-4">
          <div className="w-full max-w-sm">
            <LockPickGame
              state={lockPickState}
              currentUserId={currentUserId ?? ""}
              isWaiting={isWaiting}
              onAction={onLockPickAction}
            />
          </div>
        </div>
      );
    }
    if (dabState) {
      return (
        <div className="grid place-items-center h-full w-full p-4">
          <div className="w-full max-w-md">
            <DotsAndBoxesBoard
              state={dabState}
              currentUserId={currentUserId ?? ""}
              isMyTurn={isMyTurn}
              isWaiting={isWaiting}
              playersMeta={session.players}
              onMove={(payload) => onDotsAndBoxesMove(payload)}
            />
          </div>
        </div>
      );
    }
    if (chessState) {
      return (
        <div className="flex items-center justify-center h-full w-full p-4">
          <div className="w-full max-w-[500px]">
            <ChessBoard
              key={`chess-${session.id}-${session.status}`}
              board={chessState.board}
              currentPlayer={chessState.currentPlayer}
              currentUserId={currentUserId ?? ""}
              playerColor={
                chessState.players?.find((p: any) => p.userId === currentUserId)?.color ?? null
              }
              isCheck={chessState.isCheck}
              isCheckmate={chessState.isCheckmate}
              winner={chessState.winner}
              isDraw={chessState.isDraw}
              isWaiting={isWaiting}
              legalMoves={gameState?.legalMoves}
              moveHistory={chessState.moveHistory}
              onMove={(pos) => onChessMove(pos)}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full w-full p-4">
        <p className="text-sm text-muted">در نسخه MVP این بخش به‌صورت Modal یا Fullscreen باز می‌شود.</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-panel-deep flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur text-white/60 hover:text-white hover:bg-black/70 transition-all active:scale-90"
      >
        <X size={18} />
      </button>

      {/* End game request button */}
      {!isFinished && !isWaiting && onRequestEnd && (
        <div className="absolute top-3 left-3 z-50 pointer-events-auto">
          <button
            onClick={onRequestEnd}
            disabled={votedToEnd}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all backdrop-blur ${
              votedToEnd
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-red-500/20 text-red-300 hover:bg-red-500/30 active:scale-95"
            }`}
          >
            {votedToEnd
              ? `درخواست ثبت شد (${endGameRequests.length}/${session.players?.length ?? "?"})`
              : `پایان بازی (${endGameRequests.length}/${session.players?.length ?? "?"})`}
          </button>
        </div>
      )}

      {/* Game content */}
      <div className="flex-1 min-h-0">
        {renderGame()}
      </div>

      {/* Overlays */}
      {(isWaiting || isFinished) && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          {isFinished ? (
            <div className="w-full max-w-sm rounded-2xl border border-outline bg-panel p-6 text-center">
              {isDraw ? (
                <>
                  <Handshake size={48} className="mx-auto text-accent" />
                  <p className="mt-4 text-xl font-bold text-on-surface">مساوی شد!</p>
                  <p className="mt-1 text-sm text-muted">بازی بدون برنده تموم شد</p>
                </>
              ) : iAmWinner ? (
                <>
                  <PartyPopper size={48} className="mx-auto text-accent" />
                  <p className="mt-4 text-xl font-bold text-accent">بُردی!</p>
                  <p className="mt-1 text-sm text-muted">+1 XP بهت اضافه شد</p>
                </>
              ) : winnerName ? (
                <>
                  <Trophy size={48} className="mx-auto text-accent/60" />
                  <p className="mt-4 text-xl font-bold text-on-surface">{winnerName} بُرد!</p>
                  <p className="mt-1 text-sm text-muted">این دفعه جبران کن</p>
                </>
              ) : (
                <>
                  <Clock size={48} className="mx-auto text-muted/60" />
                  <p className="mt-4 text-xl font-bold text-on-surface">وقت تموم شد</p>
                  <p className="mt-1 text-sm text-muted">بازیکن قطع شد</p>
                </>
              )}
              <button
                onClick={onClose}
                className="mt-6 rounded-lg bg-accent-bright px-6 py-2.5 text-[13px] font-bold text-panel-deep transition-all hover:brightness-110"
              >
                بستن
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-2xl border border-outline bg-panel p-6 text-center">
              {disconnectedPlayers.length > 0 && (
                <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-xs text-red-300">
                  {disconnectedPlayers.map((p) => (
                    <p key={p.userId}>بازیکن {p.username ?? p.userId} قطع شده — ۶۰ ثانیه برای برگشت</p>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted">در انتظار شروع بازی...</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg bg-panel-soft px-4 py-2.5 text-[13px] text-muted transition-all hover:brightness-110"
                >
                  بستن
                </button>
                <button
                  onClick={onStart}
                  className="rounded-lg bg-accent-bright px-5 py-2.5 text-[13px] font-bold text-panel-deep transition-all duration-200 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!canStart}
                >
                  {canStart ? "بزن بریم!" : "دنبال بازیکن..."}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
