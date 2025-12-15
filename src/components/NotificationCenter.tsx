import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  FileText, 
  Users, 
  Building2,
  Clock,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'fiscal' | 'cadastro' | 'sistema' | 'financeiro';
  actionUrl?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'NFS-e Autorizada',
    message: 'Nota fiscal #12345 da empresa Tech Solutions LTDA foi autorizada com sucesso.',
    timestamp: '2024-12-05T14:30:00',
    read: false,
    category: 'fiscal',
    actionUrl: '/notas-fiscais'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Rascunho Pendente',
    message: 'Você tem um rascunho de NFS-e pendente há 2 dias para Consultoria ABC.',
    timestamp: '2024-12-05T10:15:00',
    read: false,
    category: 'fiscal',
    actionUrl: '/notas-fiscais'
  },
  {
    id: '3',
    type: 'info',
    title: 'Nova Empresa Cadastrada',
    message: 'A empresa Marketing Digital ME foi cadastrada com sucesso.',
    timestamp: '2024-12-05T09:45:00',
    read: true,
    category: 'cadastro'
  },
  {
    id: '4',
    type: 'error',
    title: 'Erro na Emissão',
    message: 'Falha na emissão da NFS-e #12346. Verifique os dados do tomador.',
    timestamp: '2024-12-04T16:20:00',
    read: false,
    category: 'fiscal',
    actionUrl: '/notas-fiscais'
  },
  {
    id: '5',
    type: 'info',
    title: 'Backup Concluído',
    message: 'Backup automático dos dados foi realizado com sucesso.',
    timestamp: '2024-12-04T02:00:00',
    read: true,
    category: 'sistema'
  },
  {
    id: '6',
    type: 'warning',
    title: 'Documentos Pendentes',
    message: '5 empresas estão com documentos fiscais pendentes de upload.',
    timestamp: '2024-12-03T14:00:00',
    read: false,
    category: 'cadastro'
  }
];

interface NotificationCenterProps {
  onNavigate?: (page: string) => void;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fiscal':
        return <FileText className="w-3 h-3" />;
      case 'cadastro':
        return <Building2 className="w-3 h-3" />;
      case 'financeiro':
        return <Users className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fiscal':
        return 'bg-blue-100 text-blue-800';
      case 'cadastro':
        return 'bg-green-100 text-green-800';
      case 'financeiro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Agora mesmo';
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl && onNavigate) {
      const page = notification.actionUrl.replace('/', '');
      onNavigate(page);
      setIsOpen(false);
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey = '';
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Ontem';
    } else {
      groupKey = date.toLocaleDateString('pt-BR');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-600 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end" 
        side="bottom"
        sideOffset={5}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Você tem {unreadCount} notificação{unreadCount > 1 ? 'ões' : ''} não lida{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(groupedNotifications).map(([date, notificationGroup]) => (
                    <div key={date}>
                      <div className="px-4 py-2 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {date}
                        </p>
                      </div>
                      {notificationGroup.map((notification, index) => (
                        <div key={notification.id} className="relative">
                          <div
                            className={`p-4 border-l-2 cursor-pointer hover:bg-muted/20 transition-colors ${
                              !notification.read 
                                ? 'bg-muted/10 border-l-primary' 
                                : 'border-l-transparent'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                    {notification.title}
                                  </p>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${getCategoryColor(notification.category)}`}
                                  >
                                    <span className="flex items-center gap-1">
                                      {getCategoryIcon(notification.category)}
                                      {notification.category}
                                    </span>
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-1">
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {index < notificationGroup.length - 1 && (
                            <Separator className="ml-11" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}