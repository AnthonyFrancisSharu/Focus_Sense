'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Save, Download, Trash2 } from 'lucide-react'

interface NotepadProps {
  notes: string
  onNotesChange: (notes: string) => void
}

export default function Notepad({ notes, onNotesChange }: NotepadProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `learning-notes-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all notes?')) {
      onNotesChange('')
    }
  }

  const wordCount = notes.trim().split(/\s+/).filter(word => word.length > 0).length
  const charCount = notes.length

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Learning Notes
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className={`transition-all duration-300 ${isExpanded ? 'h-96' : 'h-32'}`}>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Take notes during your learning session...&#10;&#10;• Key concepts learned&#10;• Important points to remember&#10;• Questions or areas for further study&#10;• Personal insights and reflections"
          className="w-full h-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Note Statistics */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex space-x-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Auto-saved locally
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary px-3 py-1 text-sm disabled:opacity-50"
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="w-3 h-3 mr-1" />
                Save
              </div>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={!notes.trim()}
            className="btn btn-secondary px-3 py-1 text-sm disabled:opacity-50"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </button>
        </div>

        <button
          onClick={handleClear}
          disabled={!notes.trim()}
          className="btn btn-danger px-3 py-1 text-sm disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </button>
      </div>

      {/* Quick Tips */}
      {!notes.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Note-taking Tips:</h5>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Use bullet points for key concepts</li>
            <li>• Write questions as they come to mind</li>
            <li>• Note timestamps for important moments</li>
            <li>• Include personal insights and connections</li>
          </ul>
        </motion.div>
      )}
    </div>
  )
}
