import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { AlertCircle, FileText, Image, Trash2, Upload, X } from 'lucide-react';
import { toast } from "sonner@2.0.3";

interface DocumentUploadProps {
  entityType: 'pessoa' | 'empresa';
  entityId: string;
  entityName: string;
  onDocumentUploaded?: (document: any) => void;
}

interface UploadedDocument {
  id: string;
  nome_arquivo: string;
  tipo: string;
  tamanho: number;
  url: string;
  data_upload: string;
}

export function DocumentUpload({ entityType, entityId, entityName, onDocumentUploaded }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([
    // Mock data
    {
      id: '1',
      nome_arquivo: 'contrato_social.pdf',
      tipo: 'application/pdf',
      tamanho: 1024000,
      url: '#',
      data_upload: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      nome_arquivo: 'documento_identidade.jpg',
      tipo: 'image/jpeg',
      tamanho: 512000,
      url: '#',
      data_upload: '2024-01-10T14:20:00Z'
    }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido', {
        description: 'Apenas PDF, JPG e PNG são aceitos'
      });
      return;
    }

    // Validar tamanho (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 5MB'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simular upload com progresso
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(uploadInterval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Simular delay de upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(uploadInterval);
      setUploadProgress(100);

      // Simular documento criado
      const newDocument: UploadedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        nome_arquivo: file.name,
        tipo: file.type,
        tamanho: file.size,
        url: URL.createObjectURL(file), // Em produção seria a URL do servidor
        data_upload: new Date().toISOString()
      };

      setDocuments(prev => [newDocument, ...prev]);
      
      toast.success('Documento enviado com sucesso!', {
        description: `${file.name} foi adicionado aos documentos de ${entityName}`
      });

      onDocumentUploaded?.(newDocument);

    } catch (error) {
      toast.error('Erro ao enviar documento', {
        description: 'Tente novamente em alguns instantes'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input
      event.target.value = '';
    }
  }, [entityName, onDocumentUploaded]);

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    try {
      // Simular exclusão
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      toast.success('Documento removido', {
        description: `${fileName} foi removido com sucesso`
      });
    } catch (error) {
      toast.error('Erro ao remover documento');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) return Image;
    if (tipo === 'application/pdf') return FileText;
    return FileText;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Documentos - {entityName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          {isUploading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Enviando documento...</p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Clique para enviar ou arraste arquivos aqui</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG até 5MB</p>
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                Selecionar Arquivo
              </Button>
            </div>
          )}
        </div>

        {/* Lista de Documentos */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Documentos Enviados ({documents.length})</h4>
            <div className="space-y-2">
              {documents.map((doc) => {
                const FileIcon = getFileIcon(doc.tipo);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.tamanho)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.data_upload)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id, doc.nome_arquivo)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Informações sobre LGPD */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">Política de Privacidade</p>
            <p>Os documentos são armazenados de forma segura e criptografada. Apenas usuários autorizados têm acesso aos arquivos.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}