const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const imports = `'use client'

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

// Kanban Columns Definition`;

content = content.replace(/'use client'\n*const COLUMNS/, imports + '\nconst COLUMNS');
fs.writeFileSync(file, content);
console.log('Restored imports.');
