const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const missingTop = `'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Square, Pause, Droplet, Beaker, Archive, CheckCircle, Factory, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const COLUMNS = [
  { id: 'MM-RM', title: '1. ชั่งสาร (MM-RM)', keywords: ['ชั่ง', 'mm-rm'], colorClasses: { bg: 'bg-amber-50', header: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-200 text-amber-800', cardBorder: 'border-t-amber-500' } },
  { id: 'MIX', title: '2. ห้องผสม (Mix 1-6)', keywords: ['ผสม', 'mix'], colorClasses: { bg: 'bg-[#D4AF37]/', header: 'bg-[#D4AF37]/', border: 'border-[#D4AF37]/30', text: 'text-[#4A4238]', badge: 'bg-[#D4AF37]/ text-[#4A4238]', cardBorder: 'border-t-blue-500' } },
  { id: 'QC', title: '3. สถานะ QC', keywords: ['qc', 'quarantine', 'passed', 'rejected'], colorClasses: { bg: 'bg-purple-50', header: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-800', cardBorder: 'border-t-purple-500' } },
  { id: 'PACKING', title: '4. ห้องบรรจุ (Packing)', keywords: ['บรรจุ', 'packing'], colorClasses: { bg: 'bg-emerald-50', header: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-200 text-emerald-800', cardBorder: 'border-t-emerald-500' } },\n`;

// Since the top of the file right now is `{ id: 'POF'...`, let's just prepend missingTop.
// But first, let's make sure we clean up if there's any stray characters.
const currentLines = content.split('\n');
const pofIndex = currentLines.findIndex(l => l.includes("{ id: 'POF'"));

if (pofIndex !== -1) {
  content = missingTop + currentLines.slice(pofIndex).join('\n');
  fs.writeFileSync(file, content);
  console.log('Fixed top of file successfully.');
} else {
  console.log('Could not find POF index.');
}
