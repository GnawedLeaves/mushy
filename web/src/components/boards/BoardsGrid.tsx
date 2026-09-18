"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, LayoutGrid } from "lucide-react";

export interface BoardTile {
  id: string;
  title: string;
  is_private: boolean;
  cover: string | null;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function BoardsGrid({ boards }: { boards: BoardTile[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {boards.map((board) => (
        <motion.div key={board.id} variants={item} whileHover={{ y: -3 }}>
          <Link
            href={`/boards/${board.id}`}
            className="group block overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="relative flex aspect-square items-center justify-center bg-muted">
              {board.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={board.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <LayoutGrid className="h-6 w-6 text-muted-foreground" />
              )}
              {board.is_private && <Lock className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-medium">{board.title}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
