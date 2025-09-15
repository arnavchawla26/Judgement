import React from 'react';
import { Player } from '@/types/game';

type RoundResultRow = { playerId: string; name: string; bid: number; handsWon: number; points: number; cumulative?: number };
type RoundSummary = { round: number; handSize: number; trump: string | null; results: RoundResultRow[] };

export function ScoreboardModal({ rounds, players, onClose }: { rounds: RoundSummary[]; players: Player[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2">
      <div className="game-table rounded-2xl p-4 w-[92vw] md:w-[900px] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Scoreboard</h2>
          <button onClick={onClose} className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80">Close</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left p-2">Player</th>
                {rounds?.map((r) => (
                  <th key={r.round} className="text-left p-2 whitespace-nowrap">
                    R{r.round + 1} ({r.handSize}{r.trump ? ` ${symbol(r.trump)}` : ''})
                  </th>
                ))}
                <th className="text-left p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const total = (rounds || []).reduce((acc, r) => {
                  const row = r.results.find((x) => x.playerId === p.id);
                  return acc + (row?.points ?? 0);
                }, 0);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-2 font-semibold">{p.name}</td>
                    {(rounds || []).map((r) => {
                      const row = r.results.find((x) => x.playerId === p.id);
                      return (
                        <td key={r.round} className="p-2 align-top">
                          {row ? (
                            <div>
                              <div>
                                {row.bid} → {row.handsWon}
                              </div>
                              <div className="text-muted-foreground">+{row.points}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 font-bold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function symbol(s: string) {
  switch (s) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
    default:
      return '';
  }
}

export default ScoreboardModal;

