// services/apiService.js - Version complète corrigée

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// ==================== GESTION DU TOKEN ====================
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// ==================== REQUÊTES JSON ====================
const request = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur API (${endpoint}):`, error);
    throw error;
  }
};

// ==================== REQUÊTES AVEC FICHIERS (FormData) ====================
const fileUploadRequest = async (endpoint, formData, options = {}) => {
  const token = getToken();
  
  const config = {
    method: options.method || 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    body: formData,
  };

  // Supprimer Content-Type s'il a été ajouté par erreur
  if (config.headers['Content-Type']) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur API File Upload (${endpoint}):`, error);
    throw error;
  }
};

// ==================== AUTHENTIFICATION ====================
export const authService = {
  login: async (credentials) => {
    const response = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        pwd: credentials.pwd
      }),
    });
    
    if (response.success && response.data.token) {
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  logout: async () => {
    try {
      await request('/users/logout', {
        method: 'POST',
      });
    } finally {
      removeToken();
      localStorage.removeItem('user');
    }
  },

  register: async (userData) => {
    return request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// ==================== UTILISATEURS (CLIENTS) ====================
export const usersService = {
  // Mettre à jour le profil (PATCH)
  updateProfile: async (profileData) => {
    const response = await request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });

    // Mettre à jour localStorage si succès
    if (response.success && response.data) {
      const currentUser = authService.getCurrentUser();
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return response;
  },

  // Mettre à jour la photo de profil
  updateProfilePicture: async (formData) => {
    const response = await fileUploadRequest('/users/profile/photo', formData, {
      method: 'POST',
    });

    // Mettre à jour localStorage avec la nouvelle photo
    if (response.success && response.data?.photoUrl) {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.photo = response.data.photoUrl;
        currentUser.photoUrl = response.data.photoUrl;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    }

    return response;
  },

  // Supprimer la photo de profil
  deleteProfilePicture: async () => {
    const response = await request('/users/profile/photo', {
      method: 'DELETE',
    });

    // Mettre à jour localStorage
    if (response.success) {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.photo = null;
        currentUser.photoUrl = null;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    }

    return response;
  },

  // Récupérer tous les utilisateurs
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await request(`/users${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Récupérer un utilisateur par ID
  getById: async (id) => {
    const response = await request(`/users/${id}`);
    return response.data;
  },

  // Créer un utilisateur
  create: async (userData) => {
    return request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Mettre à jour un utilisateur (admin)
  update: async (id, userData) => {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Supprimer un utilisateur
  delete: async (id) => {
    return request(`/users/delete/${id}`, {
      method: 'DELETE',
    });
  },

  // Bloquer un utilisateur
  block: async (id) => {
    return request(`/users/block/${id}`, {
      method: 'PATCH',
    });
  },

  // Débloquer un utilisateur
  unblock: async (id) => {
    return request(`/users/debloquer/${id}`, {
      method: 'PATCH',
    });
  },

  // Bloquer plusieurs utilisateurs
  blockMultiple: async (userIds) => {
    return request('/users/mulblock', {
      method: 'PATCH',
      body: JSON.stringify({ userIds }),
    });
  },

  // Supprimer plusieurs utilisateurs
  deleteMultiple: async (userIds) => {
    return request('/users/muldelete', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  },
};

// ==================== DISTRIBUTEURS ====================
export const distributeursService = {
  getAll: async (params = {}) => {
    try {
      const response = await request('/users');
      
      if (!response.data || !response.data.users) {
        console.warn('Aucune donnée utilisateur trouvée');
        return { distributeurs: [] };
      }

      const distributeurs = response.data.users
        .filter(user => user.typeUtilisateur === 'DISTRIBUTEUR')
        .map(user => ({
          id: user._id,
          nom: `${user.prenom} ${user.nom}`,
          prenom: user.prenom,
          nomFamille: user.nom,
          telephone: user.tel,
          zone: user.adresse || 'Non défini',
          email: user.email,
          transactions: 0,
          commission: 0,
          numeroCompte: user.numeroCompte || 'N/A',
          isBlocked: user.isBlocked || false,
          dateCreation: user.dateCreation,
          NcarteIdentite: user.NcarteIdentite
        }));

      return { distributeurs };
      
    } catch (error) {
      console.error('Erreur dans getAll distributeurs:', error);
      return { distributeurs: [] };
    }
  },

  create: async (distributeurData) => {
    const userData = {
      nom: distributeurData.nom,
      prenom: distributeurData.prenom,
      email: distributeurData.email,
      tel: distributeurData.tel,
      adresse: distributeurData.adresse,
      NcarteIdentite: distributeurData.NcarteIdentite,
      dateNaissance: distributeurData.dateNaissance,
      pwd: distributeurData.pwd || 'Distributeur@123',
      typeUtilisateur: 'DISTRIBUTEUR'
    };
    
    return request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  update: async (id, distributeurData) => {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(distributeurData),
    });
  },

  delete: async (id) => {
    return request(`/users/delete/${id}`, {
      method: 'DELETE',
    });
  },

  block: async (id) => {
    return request(`/users/block/${id}`, {
      method: 'PATCH',
    });
  },

  unblock: async (id) => {
    return request(`/users/debloquer/${id}`, {
      method: 'PATCH',
    });
  },
};

// ==================== DASHBOARD ====================
export const dashboardService = {
  getStats: async () => {
    try {
      const response = await usersService.getAll();
      return {
        totalClients: response.users?.filter(u => u.typeUtilisateur === 'CLIENT').length || 0,
        totalDistributeurs: response.users?.filter(u => u.typeUtilisateur === 'DISTRIBUTEUR').length || 0,
        totalAgents: response.users?.filter(u => u.typeUtilisateur === 'AGENT').length || 0,
        transactionsToday: 0,
        volumeTransactions: 0,
      };
    } catch (error) {
      console.error('Erreur dashboard stats:', error);
      return {
        totalClients: 0,
        totalDistributeurs: 0,
        totalAgents: 0,
        transactionsToday: 0,
        volumeTransactions: 0,
      };
    }
  },
};

// ==================== COMPTES ====================
export const comptesService = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await request(`/comptes${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getByNumero: async (numeroCompte) => {
    const response = await request(`/comptes/${numeroCompte}`);
    return response.data;
  },

  create: async (compteData) => {
    return request('/comptes', {
      method: 'POST',
      body: JSON.stringify(compteData),
    });
  },

  updateSolde: async (numeroCompte, montant, operation) => {
    return request(`/comptes/${numeroCompte}/solde`, {
      method: 'PATCH',
      body: JSON.stringify({ montant, operation }),
    });
  },
};

// ==================== TRANSACTIONS ====================
export const transactionsService = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await request(`/transactions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  create: async (transactionData) => {
    return request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  getStats: async () => {
    const response = await request('/transactions/stats');
    return response.data;
  },

  cancel: async (id, raison) => {
    return request(`/transactions/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ raison }),
    });
  },
};

// ==================== EXPORT DEFAULT ====================
const apiService = {
  auth: authService,
  users: usersService,
  clients: usersService,
  distributeurs: distributeursService,
  comptes: comptesService,
  transactions: transactionsService,
  dashboard: dashboardService,
};

export default apiService;