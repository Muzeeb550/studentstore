'use client';

import { BookmarkProvider } from '../context/BookmarkContext';
import SkillstoreNavbar from '../components/SkillstoreNavbar';
import './skillstore.css'; // ✅ Import SkillStore CSS

export default function SkillStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookmarkProvider>
      <SkillstoreNavbar />
      {children}
    </BookmarkProvider>
  );
}
