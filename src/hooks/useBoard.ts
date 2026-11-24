"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api-client";
import { applyMove, keyAtEnd } from "@/lib/ordering";
import type { BoardDTO, CardDTO } from "@/lib/types";

export const boardKey = (boardId: string) => ["board", boardId] as const;
const mutationKey = (boardId: string) => ["board-mutation", boardId] as const;

export function useBoard(initialBoard: BoardDTO) {
  return useQuery({
    queryKey: boardKey(initialBoard.id),
    queryFn: () => api.getBoard(initialBoard.id),
    initialData: initialBoard,
  });
}

/**
 * A mutation that updates the cached board straight away, then lets the server
 * confirm it. The optimistic write happens synchronously, before the request,
 * so a dropped card never flashes back to where it came from.
 *
 * Several mutations can be in flight at once (fast drags). The board is only
 * refetched when the last one settles, so an early response can't overwrite a
 * later optimistic move. On error the refetch puts the true state back.
 */
function useBoardMutation<V>(
  boardId: string,
  mutationFn: (vars: V) => Promise<unknown>,
  optimistic?: (board: BoardDTO, vars: V) => BoardDTO,
) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationKey: mutationKey(boardId),
    mutationFn,
    onError: (error) => toast(error.message),
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: mutationKey(boardId) }) === 1) {
        await queryClient.invalidateQueries({ queryKey: boardKey(boardId) });
      }
    },
  });

  return (vars: V) => {
    if (optimistic) {
      void queryClient.cancelQueries({ queryKey: boardKey(boardId) });
      queryClient.setQueryData<BoardDTO>(boardKey(boardId), (board) =>
        board ? optimistic(board, vars) : board,
      );
    }
    mutation.mutate(vars);
  };
}

const mapCard = (board: BoardDTO, cardId: string, fn: (card: CardDTO) => CardDTO): BoardDTO => ({
  ...board,
  columns: board.columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => (card.id === cardId ? fn(card) : card)),
  })),
});

let tempCounter = 0;
export const isTempId = (id: string) => id.startsWith("temp-");

export function useBoardMutations(boardId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const renameBoard = useBoardMutation(
    boardId,
    async (title: string) => {
      await api.renameBoard(boardId, title);
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    (board, title) => ({ ...board, title }),
  );

  const addColumnMutation = useMutation({
    mutationFn: (title: string) => api.createColumn(boardId, title),
    onSuccess: (column) =>
      queryClient.setQueryData<BoardDTO>(boardKey(boardId), (board) =>
        board ? { ...board, columns: [...board.columns, column] } : board,
      ),
    onError: (error) => toast(error.message),
  });

  const renameColumn = useBoardMutation(
    boardId,
    ({ columnId, title }: { columnId: string; title: string }) => api.renameColumn(columnId, title),
    (board, { columnId, title }) => ({
      ...board,
      columns: board.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }),
  );

  const deleteColumn = useBoardMutation(
    boardId,
    (columnId: string) => api.deleteColumn(columnId),
    (board, columnId) => ({ ...board, columns: board.columns.filter((c) => c.id !== columnId) }),
  );

  const addCard = useBoardMutation(
    boardId,
    ({ columnId, title }: { columnId: string; title: string; tempId: string }) =>
      api.createCard(columnId, title),
    (board, { columnId, title, tempId }) => ({
      ...board,
      columns: board.columns.map((column) =>
        column.id !== columnId
          ? column
          : {
              ...column,
              cards: [
                ...column.cards,
                {
                  id: tempId,
                  title,
                  description: "",
                  position: keyAtEnd(column.cards),
                  columnId,
                  blockerIds: [],
                },
              ],
            },
      ),
    }),
  );

  const updateCard = useBoardMutation(
    boardId,
    ({ cardId, ...data }: { cardId: string; title?: string; description?: string }) =>
      api.updateCard(cardId, data),
    (board, { cardId, ...data }) => mapCard(board, cardId, (card) => ({ ...card, ...data })),
  );

  const deleteCard = useBoardMutation(
    boardId,
    (cardId: string) => api.deleteCard(cardId),
    (board, cardId) => ({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        cards: column.cards
          .filter((c) => c.id !== cardId)
          .map((c) => ({ ...c, blockerIds: c.blockerIds.filter((id) => id !== cardId) })),
      })),
    }),
  );

  const moveCard = useBoardMutation(
    boardId,
    ({ cardId, columnId, index }: { cardId: string; columnId: string; index: number }) =>
      api.moveCard(cardId, columnId, index),
    (board, { cardId, columnId, index }) => applyMove(board, cardId, columnId, index),
  );

  const addBlocker = useBoardMutation(
    boardId,
    ({ cardId, blockerId }: { cardId: string; blockerId: string }) =>
      api.addBlocker(cardId, blockerId),
    (board, { cardId, blockerId }) =>
      mapCard(board, cardId, (card) => ({
        ...card,
        blockerIds: [...new Set([...card.blockerIds, blockerId])],
      })),
  );

  const removeBlocker = useBoardMutation(
    boardId,
    ({ cardId, blockerId }: { cardId: string; blockerId: string }) =>
      api.removeBlocker(cardId, blockerId),
    (board, { cardId, blockerId }) =>
      mapCard(board, cardId, (card) => ({
        ...card,
        blockerIds: card.blockerIds.filter((id) => id !== blockerId),
      })),
  );

  return {
    renameBoard,
    addColumn: (title: string) => addColumnMutation.mutate(title),
    isAddingColumn: addColumnMutation.isPending,
    renameColumn,
    deleteColumn,
    addCard: (columnId: string, title: string) =>
      addCard({ columnId, title, tempId: `temp-${++tempCounter}` }),
    updateCard,
    deleteCard,
    moveCard,
    addBlocker,
    removeBlocker,
  };
}
