import { useState, useRef } from 'react'
import { SlidePanel } from '@/components/ui/SlidePanel'
import {
  exportProject, downloadBackup,
  importProject, parseBackupFile,
  type FlowBackup, type ImportResult,
} from '@/lib/exportImport'
import { useFlowStore } from '@/store/flow'
import styles from './ExportImportPanel.module.css'

interface ExportImportPanelProps {
  open:      boolean
  onClose:   () => void
  projectId: string
  projectName: string
}

type ImportMode = 'merge' | 'replace'
type Step = 'idle' | 'exporting' | 'importing' | 'done' | 'error'

export function ExportImportPanel({ open, onClose, projectId, projectName }: ExportImportPanelProps) {
  const loadProject = useFlowStore(s => s.loadProject)

  // ── Export state ──
  const [exportStep, setExportStep] = useState<Step>('idle')
  const [exportError, setExportError] = useState<string | null>(null)

  // ── Import state ──
  const [importStep,   setImportStep]   = useState<Step>('idle')
  const [importMode,   setImportMode]   = useState<ImportMode>('merge')
  const [backup,       setBackup]       = useState<FlowBackup | null>(null)
  const [parseError,   setParseError]   = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Handlers ──────────────────────────────

  async function handleExport() {
    setExportStep('exporting')
    setExportError(null)
    try {
      const bk = await exportProject(projectId)
      downloadBackup(bk)
      setExportStep('done')
      setTimeout(() => setExportStep('idle'), 3000)
    } catch (err: unknown) {
      setExportError((err as Error).message)
      setExportStep('error')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null)
    setBackup(null)
    setImportStep('idle')
    setImportResult(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseBackupFile(ev.target?.result as string)
        setBackup(parsed)
      } catch (err: unknown) {
        setParseError((err as Error).message)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!backup) return
    if (importMode === 'replace') {
      if (!confirm(`Isso substituirá TODOS os dados do projeto "${projectName}". Continuar?`)) return
    }
    setImportStep('importing')
    setImportResult(null)
    try {
      const result = await importProject(backup, projectId, importMode)
      setImportResult(result)
      setImportStep('done')
      // Recarrega dados do projeto
      await loadProject(projectId)
    } catch (err: unknown) {
      setImportStep('error')
      setImportResult({ columnsImported: 0, cardsImported: 0, rfcsImported: 0, errors: [(err as Error).message] })
    }
  }

  function resetImport() {
    setBackup(null)
    setParseError(null)
    setImportStep('idle')
    setImportResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Export / Import" width={460}>
      <div className={styles.root}>

        {/* ── EXPORT ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon}>↓</div>
            <div>
              <p className={styles.sectionTitle}>Exportar projeto</p>
              <p className={styles.sectionSub}>Baixa um arquivo JSON com todos os dados do projeto atual.</p>
            </div>
          </div>

          <div className={styles.projectBadge}>
            <span className={styles.projectBadgeLabel}>Projeto</span>
            <span className={styles.projectBadgeName}>{projectName}</span>
          </div>

          {exportError && <p className={styles.errorMsg}>{exportError}</p>}

          {exportStep === 'done' ? (
            <div className={styles.successMsg}>✓ Arquivo baixado com sucesso!</div>
          ) : (
            <button
              className={styles.btnExport}
              onClick={handleExport}
              disabled={exportStep === 'exporting'}
            >
              {exportStep === 'exporting' ? 'Exportando…' : '↓ Baixar backup JSON'}
            </button>
          )}
        </section>

        <div className={styles.divider} />

        {/* ── IMPORT ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon}>↑</div>
            <div>
              <p className={styles.sectionTitle}>Importar backup</p>
              <p className={styles.sectionSub}>Restaura dados a partir de um arquivo JSON exportado pelo Flow.</p>
            </div>
          </div>

          {/* File picker */}
          {!backup && importStep !== 'done' && (
            <label className={styles.dropzone}>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <span className={styles.dropzoneIcon}>📂</span>
              <span className={styles.dropzoneText}>Clique para selecionar o arquivo .json</span>
              <span className={styles.dropzoneSub}>ou arraste aqui</span>
            </label>
          )}

          {parseError && (
            <div className={styles.errorMsg}>
              {parseError}
              <button className={styles.retryBtn} onClick={resetImport}>Tentar outro arquivo</button>
            </div>
          )}

          {/* Preview do backup */}
          {backup && importStep === 'idle' && (
            <div className={styles.backupPreview}>
              <p className={styles.previewTitle}>Arquivo carregado</p>
              <div className={styles.previewGrid}>
                <span className={styles.previewKey}>Projeto</span>
                <span className={styles.previewVal}>{backup.project.name}</span>
                <span className={styles.previewKey}>Exportado em</span>
                <span className={styles.previewVal}>{new Date(backup.exportedAt).toLocaleString('pt-BR')}</span>
                <span className={styles.previewKey}>Colunas</span>
                <span className={styles.previewVal}>{backup.columns.length}</span>
                <span className={styles.previewKey}>Cards</span>
                <span className={styles.previewVal}>{backup.cards.length}</span>
                <span className={styles.previewKey}>RFCs</span>
                <span className={styles.previewVal}>{backup.rfcs.length}</span>
              </div>

              {/* Modo de importação */}
              <div className={styles.modeGroup}>
                <button
                  className={`${styles.modeBtn} ${importMode === 'merge' ? styles.modeBtnActive : ''}`}
                  onClick={() => setImportMode('merge')}
                >
                  <strong>Mesclar</strong>
                  <span>Adiciona aos dados existentes</span>
                </button>
                <button
                  className={`${styles.modeBtn} ${importMode === 'replace' ? styles.modeBtnReplace : ''}`}
                  onClick={() => setImportMode('replace')}
                >
                  <strong>Substituir</strong>
                  <span>Apaga tudo e reimporta</span>
                </button>
              </div>

              {importMode === 'replace' && (
                <div className={styles.warningBanner}>
                  ⚠️ Modo substituir: todos os cards, colunas e RFCs do projeto atual serão removidos.
                </div>
              )}

              <div className={styles.importActions}>
                <button className={styles.btnGhost} onClick={resetImport}>Cancelar</button>
                <button className={styles.btnImport} onClick={handleImport}>
                  ↑ Importar dados
                </button>
              </div>
            </div>
          )}

          {/* Progresso */}
          {importStep === 'importing' && (
            <div className={styles.importing}>
              <div className={styles.spinner} />
              <span>Importando dados…</span>
            </div>
          )}

          {/* Resultado */}
          {importStep === 'done' && importResult && (
            <div className={styles.resultBox}>
              <p className={styles.resultTitle}>✓ Importação concluída</p>
              <div className={styles.resultGrid}>
                <span>Colunas importadas</span>
                <strong>{importResult.columnsImported}</strong>
                <span>Cards importados</span>
                <strong>{importResult.cardsImported}</strong>
                <span>RFCs importadas</span>
                <strong>{importResult.rfcsImported}</strong>
              </div>
              {importResult.errors.length > 0 && (
                <div className={styles.resultErrors}>
                  <p className={styles.resultErrorTitle}>{importResult.errors.length} aviso(s):</p>
                  <ul>
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <button className={styles.btnGhost} onClick={resetImport}>Importar outro arquivo</button>
            </div>
          )}

          {importStep === 'error' && importResult && (
            <div className={styles.errorMsg}>
              {importResult.errors[0]}
              <button className={styles.retryBtn} onClick={resetImport}>Tentar novamente</button>
            </div>
          )}
        </section>
      </div>
    </SlidePanel>
  )
}
