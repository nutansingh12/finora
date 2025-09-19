import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add,
  Search,
  Notifications,
  FileDownload,
  BarChart,
  TrendingUp,
  AccountBalance,
  Settings,
} from '@mui/icons-material';

const QuickActions = () => {
  const router = useRouter();

  const actions = [
    {
      title: 'Add Stock',
      description: 'Add a new stock to your portfolio',
      icon: <Add color="primary" />,
      path: '/portfolio/add-stock',
    },
    {
      title: 'Search Stocks',
      description: 'Find and analyze stocks',
      icon: <Search color="primary" />,
      path: '/search',
    },
    {
      title: 'View Analytics',
      description: 'Detailed portfolio analysis',
      icon: <BarChart color="primary" />,
      path: '/analytics',
    },
    {
      title: 'Market Overview',
      description: 'Current market trends',
      icon: <TrendingUp color="primary" />,
      path: '/market',
    },
  ];

  const secondaryActions = [
    {
      title: 'Set Price Alert',
      description: 'Get notified of price changes',
      icon: <Notifications color="secondary" />,
      path: '/alerts/create',
    },
    {
      title: 'Export Portfolio',
      description: 'Download your data',
      icon: <FileDownload color="secondary" />,
      path: '/portfolio/export',
    },
    {
      title: 'Portfolio Settings',
      description: 'Manage your preferences',
      icon: <Settings color="secondary" />,
      path: '/settings',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        
        <List sx={{ p: 0 }}>
          {actions.map((action, index) => (
            <ListItem key={action.title} disablePadding>
              <ListItemButton
                onClick={() => router.push(action.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {action.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {action.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          More Actions
        </Typography>

        <List sx={{ p: 0 }}>
          {secondaryActions.map((action) => (
            <ListItem key={action.title} disablePadding>
              <ListItemButton
                onClick={() => router.push(action.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {action.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {action.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
