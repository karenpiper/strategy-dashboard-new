'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { 
  Plus, 
  Upload,
  Loader2,
  File,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'

export default function DeckAdmin() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [manualFileId, setManualFileId] = useState('')
  const [useManualUpload, setUseManualUpload] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'success' | 'error'
    message: string
  }>({ type: 'idle', message: '' })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({
        type: 'error',
        message: 'File must be a PDF'
      })
      return
    }

    // Validate file size (100MB limit - same as work samples)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setUploadStatus({
        type: 'error',
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 100MB limit. Please use a smaller file.`
      })
      return
    }

    setSelectedFile(file)
    setUploadStatus({ type: 'idle', message: '' })
    
    // Auto-fill title from filename if empty
    if (!title) {
      setTitle(file.name.replace('.pdf', ''))
    }
  }

  const handleUpload = async () => {
    // If using manual upload, just process the file ID
    if (useManualUpload) {
      if (!manualFileId.trim()) {
        setUploadStatus({
          type: 'error',
          message: 'Please enter a Google Drive file ID'
        })
        return
      }

      setUploading(true)
      setUploadStatus({ type: 'idle', message: '' })

      try {
        const ingestResponse = await fetch('/api/upload-deck', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gdrive_file_id: manualFileId.trim(),
            title: title.trim() || undefined,
          }),
        })

        const ingestResult = await ingestResponse.json()

        if (!ingestResponse.ok) {
          throw new Error(ingestResult.error || 'Failed to process deck')
        }

        setUploadStatus({
          type: 'success',
          message: `Deck processed successfully! Processed ${ingestResult.slides_count} slides and ${ingestResult.topics_count} topics.`
        })

        // Reset form
        setManualFileId('')
        setTitle('')
        setUseManualUpload(false)
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          setIsUploadDialogOpen(false)
          setUploadStatus({ type: 'idle', message: '' })
        }, 2000)
      } catch (error: any) {
        console.error('Error processing deck:', error)
        setUploadStatus({
          type: 'error',
          message: error.message || 'Failed to process deck'
        })
      } finally {
        setUploading(false)
      }
      return
    }

    // Direct file upload
    if (!selectedFile) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a PDF file or use manual upload'
      })
      return
    }

    setUploading(true)
    setUploadStatus({ type: 'idle', message: '' })

    try {
      // Step 1: Create resumable upload session in Google Drive
      setUploadStatus({ type: 'idle', message: 'Creating upload session...' })
      
      const sessionResponse = await fetch('/api/decks/create-upload-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/pdf',
          fileSize: selectedFile.size,
        }),
      })

      const sessionResult = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(sessionResult.error || 'Failed to create upload session')
      }

      const { uploadUrl } = sessionResult

      // Step 2: Upload file directly to Google Drive using resumable URL
      setUploadStatus({ type: 'idle', message: 'Uploading file to Google Drive...' })
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/pdf',
          'Content-Length': selectedFile.size.toString(),
        },
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`)
      }

      // Step 3: Get file ID from upload response
      const uploadResult = await uploadResponse.json()
      const fileId = uploadResult.id
      
      if (!fileId) {
        throw new Error('Failed to get file ID from upload response')
      }

      // Step 2: Ingest the deck from Google Drive
      const ingestResponse = await fetch('/api/upload-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gdrive_file_id: fileId,
          title: title.trim() || undefined,
        }),
      })

      const ingestResult = await ingestResponse.json()

      if (!ingestResponse.ok) {
        throw new Error(ingestResult.error || 'Failed to process deck')
      }

      setUploadStatus({
        type: 'success',
        message: `Deck uploaded successfully! Processed ${ingestResult.slides_count} slides and ${ingestResult.topics_count} topics.`
      })

      // Reset form
      setSelectedFile(null)
      setTitle('')
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsUploadDialogOpen(false)
        setUploadStatus({ type: 'idle', message: '' })
      }, 2000)
    } catch (error: any) {
      console.error('Error uploading deck:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload deck'
      })
    } finally {
      setUploading(false)
    }
  }

  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]'
      case 'chill': return 'bg-[#F5E6D3]'
      case 'code': return 'bg-black'
      default: return 'bg-[#1A1A1A]'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos': return 'text-white'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-[#FFFFFF]'
      default: return 'text-white'
    }
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} p-8`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Deck Management</h1>
          <p className="text-muted-foreground">
            Upload presentation PDFs to make them searchable with AI-powered semantic search
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Upload New Deck</h2>
              <p className="text-sm text-muted-foreground">
                Upload a PDF presentation deck. The system will extract text, generate AI summaries, 
                and create embeddings for semantic search.
              </p>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Presentation Deck</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="useManual"
                      checked={useManualUpload}
                      onChange={(e) => {
                        setUseManualUpload(e.target.checked)
                        if (e.target.checked) {
                          setSelectedFile(null)
                        }
                      }}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="useManual" className="cursor-pointer text-sm">
                      Upload manually to Google Drive and paste file ID
                    </Label>
                  </div>

                  {useManualUpload ? (
                    <div>
                      <Label htmlFor="manualFileId">Google Drive File ID</Label>
                      <Input
                        id="manualFileId"
                        value={manualFileId}
                        onChange={(e) => setManualFileId(e.target.value)}
                        placeholder="Paste Google Drive file ID here (from the file URL)"
                        disabled={uploading}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Alternative to direct upload - for files larger than 4.5MB, upload manually to Google Drive and paste the file ID here.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="file">PDF File</Label>
                      <div className="mt-2">
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleFileSelect}
                          disabled={uploading}
                          className="cursor-pointer"
                        />
                        {selectedFile && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <File className="w-4 h-4" />
                            <span>{selectedFile.name}</span>
                            <span className="text-xs">
                              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: Files larger than 4.5MB will need to be uploaded manually to Google Drive.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Deck title (auto-filled from filename)"
                      disabled={uploading}
                      className="mt-2"
                    />
                  </div>

                  {uploadStatus.type !== 'idle' && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 ${
                      uploadStatus.type === 'success' 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}>
                      {uploadStatus.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                      )}
                      <p className={`text-sm ${
                        uploadStatus.type === 'success' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-destructive'
                      }`}>
                        {uploadStatus.message}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsUploadDialogOpen(false)
                        setSelectedFile(null)
                        setTitle('')
                        setUploadStatus({ type: 'idle', message: '' })
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Process
                        </>
                      )}
                    </Button>
                  </div>

                  {uploading && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>This may take a minute or two...</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Uploading to Google Drive</li>
                        <li>Extracting text from PDF</li>
                        <li>Generating AI summaries</li>
                        <li>Creating embeddings</li>
                      </ul>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">How it works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Upload a PDF presentation deck (max 100MB, 100 pages)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>The system extracts text from each slide</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>AI generates summaries at deck, topic, and slide levels</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">4.</span>
                <span>Embeddings are created for semantic search</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">5.</span>
                <span>Your deck becomes searchable via keyword and semantic search</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

