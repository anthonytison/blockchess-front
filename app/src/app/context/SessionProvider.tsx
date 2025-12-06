'use client'

import { ReactNode, createContext } from "react";
import { PlayerEntity } from "@/domain/entities";

interface ISessionContext {
    player: PlayerEntity | null
}

export interface ISessionProvider {
  children: ReactNode
  player: PlayerEntity | null
}

export const SessionContext = createContext({
    player: null
} as ISessionContext)

const SessionProvider = ({ children, player }: ISessionProvider) => {

    return (
        <SessionContext.Provider value={{
            player
        }}>
        {children}
        </SessionContext.Provider>
    )
}

export default SessionProvider;