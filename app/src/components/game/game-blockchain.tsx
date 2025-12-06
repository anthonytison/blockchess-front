"use client";

import { useGame } from "@/contexts/game-context";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { DateTime } from "luxon"
import { ResultJson, TransactionBlock, useBlockchain } from "@/hooks/blockchain";

interface Props {
  className?: string
}

const GameBlockchain = ({ className }: Props) => {

  const t = useTranslations('events')

  const { gameState } = useGame();

  const { useLoadEvents } = useBlockchain();

  const gameId: string | undefined = gameState?.game.id;

  // Load events from blockchain (fetches moves, extracts digests, and loads events)
  const { events, isLoading, error } = useLoadEvents(
    gameState?.game.objectId as string,
    gameState?.boardState.isCheckmate as boolean
  );

  if (!gameState) return null;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const displayPlayerName = (txBlock: TransactionBlock) => {
    const event = txBlock.effects?.events?.nodes[0]?.contents.json as ResultJson;
    return event.is_computer ? 
              <span> HAL</span> 
            : event.player === gameState.game.player1?.suiAddress ? 
              <span> {gameState.game.player1?.name}</span>
            : event.player === gameState.game.player2?.suiAddress ?  
              <span> {gameState.game.player2?.name}</span>
            : event.player1 === gameState.game.player1?.suiAddress ?  
              <span> {gameState.game.player1?.name}</span>
            : event.player1 === gameState.game.player2?.suiAddress ?  
              <span> {gameState.game.player2?.name}</span>
            : event.winner === gameState.game.player1?.suiAddress ?  
              <span> {gameState.game.player1?.name}</span>
            : event.winner === gameState.game.player2?.suiAddress ?  
              <span> {gameState.game.player2?.name}</span>
            : !!event.winner ?  
              <span> HAL</span>
            :  
              <span> Player</span>
  }


  return (
    <div className="game-blockchain mt-5">

      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            {t('title')} {events.length > 0 ? `(${events.length} ${events.length > 1 ? t('transactions') : t('transaction')})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-full max-h-250 overflow-y-auto flow-root container m-auto p-5 dark:bg-slate-950">
            <div className="divide-y">
              {events.map((txBlock: TransactionBlock, txIndex: number) => (
                <details key={`${txBlock.digest}-${txIndex}`} className="group">
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-medium text-secondary-900 group-open:text-primary-500">
                    <div className="relative">
                      {/* <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-slate-950" aria-hidden="true"></span> */}
                      <div className="relative flex space-x-3">
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time dateTime="2020-09-20">{DateTime.fromISO(txBlock.effects?.events.nodes[0]?.timestamp as string).toFormat('dd/LL/yyyy HH:ii:ss')}</time>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap">
                          {t(`type.${txBlock.effects?.events?.nodes[0]?.contents.type.repr.replace(/(.+)::game::/gi, '').toLowerCase()}`)} {t('by')} 
                          {txBlock.effects?.events?.nodes[0]?.contents.type.repr.endsWith('GameCreated') ?
                            displayPlayerName(txBlock)
                          : txBlock.effects?.events?.nodes[0]?.contents.type.repr.endsWith('MovePlayed') && gameState.game.mode === "solo" ?
                            displayPlayerName(txBlock)
                          : txBlock.effects?.events?.nodes[0]?.contents.type.repr.endsWith('GameEnded') ?
                            displayPlayerName(txBlock)
                          : ""}
                        </div>
                      </div>
                    </div>
                    <div>
                      <svg aria-label={t('transactionDetails')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                        stroke="currentColor" className="block h-5 w-5 group-open:hidden">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <svg aria-label={t('transactionDetails')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                        stroke="currentColor" className="hidden h-5 w-5 group-open:block">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    </div>
                  </summary>
                  <div className="pb-4 text-secondary-500">
                    <div className="relative pb-8">
                      {/* <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-slate-950" aria-hidden="true"></span> */}
                      <div className="relative flex space-x-3">
                        <div className="min-w-0 flex-1 pt-1.5 flex flex-col space-y-2">
                          <pre className="whitespace-pre-wrap breakWords overflow-x-auto text-xs bg-slate-200 dark:bg-slate-900 p-3 rounded">
                            {JSON.stringify(txBlock, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
export default GameBlockchain;