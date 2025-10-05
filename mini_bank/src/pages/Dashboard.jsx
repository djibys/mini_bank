import React, { useEffect, useState } from 'react';
import { CircularStatCard, Pagination } from '../components'; 
import { usePagination } from '../hooks/usePagination';
import apiService from '../services/apiService';

const UserManagementComponent = () => { 
    // État principal pour toutes les statistiques
    const [stats, setStats] = useState({
        transactionsToday: 0,
        volumeToday: 0,
        totalClients: 0,
        totalDistributeurs: 0
    });
    
    // États pour la liste des utilisateurs
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // États pour la sélection et les actions multiples
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [isActionPending, setIsActionPending] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Initialisation et chargement des données
    useEffect(() => {
        loadUsersData();
    }, []);

    // Gestion de la pagination sur la liste des utilisateurs
    const {
        currentPage,
        totalPages,
        currentItems: currentUsers,
        handlePageChange
    } = usePagination(users, 15);

    // Fonction d'aide pour déterminer la classe CSS du badge de rôle
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'CLIENT':
                return 'bg-primary'; 
            case 'DISTRIBUTEUR':
                return 'bg-warning text-dark'; 
            case 'AGENT':
                return 'bg-info'; 
            case 'ADMIN':
                return 'bg-danger'; 
            default:
                return 'bg-secondary';
        }
    };

    // ----------------------------------------------------------------------
    // --- FONCTION DE CHARGEMENT DES DONNÉES 
    // ----------------------------------------------------------------------
    const loadUsersData = async () => {
        setLoading(true);
        setError(null);
        setSelectedUsers(new Set()); // Réinitialiser la sélection

        try {
            const [userStats, transactionStats, usersData] = await Promise.all([
                apiService.dashboard.getStats(), 
                apiService.transactions.getStats(), 
                apiService.users.getAll() 
            ]);

            setStats({
                transactionsToday: transactionStats.transactionsToday,
                volumeToday: transactionStats.volumeToday,
                totalClients: userStats.totalClients,
                totalDistributeurs: userStats.totalDistributeurs
            });

            // CORRECTION : Normalisation des données pour le Rendu (Rôle et Statut)
            const normalizedUsers = (usersData.users || []).map(user => ({
                ...user,
                role: user.typeUtilisateur, 
                estActif: !user.isBlocked, 
                _id: user._id 
            }));

            setUsers(normalizedUsers);

        } catch (err) {
            console.error('Erreur chargement utilisateurs/stats:', err);
            setError(err.message || 'Échec du chargement des données. Vérifiez la connexion API et l\'autorisation.');
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------------------------------------------------
    // --- GESTION DES ACTIONS INDIVIDUELLES (NOUVELLE FONCTION) ---
    // ----------------------------------------------------------------------

    const handleToggleBlock = async (user) => {
        if (isActionPending) return;
        setIsActionPending(true);
        setActionMessage(null);

        const action = user.estActif ? 'bloquer' : 'débloquer';

        try {
            if (user.estActif) {
                // L'utilisateur est actif, on le bloque
                await apiService.users.block(user._id);
            } else {
                // L'utilisateur est bloqué, on le débloque
                await apiService.users.unblock(user._id);
            }

            setActionMessage(`Succès : Utilisateur ${user.prenom} ${user.nom} a été ${action} avec succès.`);
            await loadUsersData(); // Recharger les données pour refléter le changement

        } catch (err) {
            console.error(`Erreur lors du ${action} individuel:`, err);
            setActionMessage(`Erreur lors de l'action de ${action} : ${err.message}`);
        } finally {
            setIsActionPending(false);
            setTimeout(() => setActionMessage(null), 5000);
        }
    };


    // ----------------------------------------------------------------------
    // --- GESTION DE LA SÉLECTION et ACTIONS MULTIPLES (Inchangée) ---
    // ----------------------------------------------------------------------

    const handleSelectUser = (userId) => {
        setSelectedUsers(prevSelected => {
            const newSet = new Set(prevSelected);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === currentUsers.length) {
            setSelectedUsers(new Set());
        } else {
            const allCurrentIds = new Set(currentUsers.map(u => u._id));
            setSelectedUsers(allCurrentIds);
        }
    };
    
    const executeMassAction = async (actionType) => {
        if (selectedUsers.size === 0) return;

        const userIds = Array.from(selectedUsers);
        setIsActionPending(true);
        setActionMessage(null);

        try {
            if (actionType === 'delete') {
                await apiService.users.deleteMultiple(userIds);
            } else if (actionType === 'block') {
                await apiService.users.blockMultiple(userIds);
            }
            
            setActionMessage(`Succès : ${selectedUsers.size} utilisateur(s) ${actionType === 'delete' ? 'supprimé(s)' : 'bloqué(s)'}.`);
            await loadUsersData(); 

        } catch (err) {
            console.error(`Erreur ${actionType} multiple:`, err);
            setActionMessage(`Erreur lors de l'action : ${err.message}`);
        } finally {
            setIsActionPending(false);
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    // ----------------------------------------------------------------------
    // --- RENDU : CHARGEMENT ET ERREUR (Inchangé) ---
    // ----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="text-muted mt-2">Chargement des statistiques et des utilisateurs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">
                    Erreur: {error}
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------------
    // --- RENDU : INTERFACE PRINCIPALE 
    // ----------------------------------------------------------------------

    return (
        <div className="container-fluid py-4">
            {/* --------------------- Statistiques Circulaires (4 Cartes) --------------------- */}
            <div className="row g-4 mb-4">
                <div className="col-xl-3 col-lg-6">
                    <CircularStatCard 
                        title="Transactions aujourd'hui" 
                        value={stats.transactionsToday.toString()} 
                        color="#0d6efd" 
                        icon="bi-graph-up-arrow"
                        percentage={stats.transactionsToday / stats.totalTransactions * 100}
                    />
                </div>
                <div className="col-xl-3 col-lg-6">
                    <CircularStatCard 
                        title="Volume aujourd'hui" 
                        value={`${stats.volumeToday.toLocaleString()} FCFA`}
                        color="#198754" 
                        icon="bi-currency-dollar"
                        percentage={stats.volumeToday / stats.totalVolume * 100}
                    />
                </div>
                <div className="col-xl-3 col-lg-6">
                    <CircularStatCard 
                        title="Total Clients" 
                        value={stats.totalClients.toString()} 
                        color="#ffc107" 
                        icon="bi-people"
                        percentage={stats.totalClients / stats.totalUsers * 100}
                    />
                </div>
                <div className="col-xl-3 col-lg-6">
                    <CircularStatCard 
                        title="Total Distributeurs" 
                        value={stats.totalDistributeurs.toString()} 
                        color="#6f42c1" 
                        icon="bi-person-check"
                        percentage={stats.totalDistributeurs / stats.totalUsers * 100}
                    />
                </div>
            </div>

            {/* --------------------- Liste des Utilisateurs --------------------- */}
            <div className="card custom-card mb-4">
                <div className="card-header bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-person-lines-fill text-primary"></i>
                            Gestion des Utilisateurs ({users.length} au total)
                        </h5>
                        <button className="btn btn-outline-primary btn-sm" onClick={loadUsersData} disabled={isActionPending}>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Actualiser
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    {/* Message de succès/erreur pour les actions de masse/individuelles */}
                    {actionMessage && (
                        <div className={`alert ${actionMessage.startsWith('Erreur') ? 'alert-danger' : 'alert-success'} mb-3`}>
                            {actionMessage}
                        </div>
                    )}
                    
                    {/* Bar d'actions multiples */}
                    {selectedUsers.size > 0 && (
                        <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
                            <span>**{selectedUsers.size}** utilisateur(s) sélectionné(s).</span>
                            <div className="btn-group">
                                <button 
                                    className="btn btn-sm btn-warning" 
                                    onClick={() => executeMassAction('block')}
                                    disabled={isActionPending}
                                >
                                    <i className="bi bi-lock me-1"></i>
                                    {isActionPending ? 'Bloquage en cours...' : 'Bloquer la sélection'}
                                </button>
                                <button 
                                    className="btn btn-sm btn-danger" 
                                    onClick={() => executeMassAction('delete')}
                                    disabled={isActionPending}
                                >
                                    <i className="bi bi-trash me-1"></i>
                                    {isActionPending ? 'Suppression en cours...' : 'Supprimer la sélection'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tableau des utilisateurs */}
                    <div className="table-responsive">
                        <table className="table table-hover custom-table mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>
                                        <input 
                                            type="checkbox" 
                                            className="form-check-input"
                                            checked={selectedUsers.size > 0 && selectedUsers.size === currentUsers.length}
                                            onChange={handleSelectAll} 
                                            disabled={isActionPending}
                                        />
                                    </th>
                                    <th>Nom & Prénom</th>
                                    <th>Email</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Création</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">Aucun utilisateur trouvé.</td>
                                    </tr>
                                ) : (
                                    currentUsers.map((user) => (
                                        <tr key={user._id}>
                                            <td>
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input"
                                                    checked={selectedUsers.has(user._id)}
                                                    onChange={() => handleSelectUser(user._id)} 
                                                    disabled={isActionPending}
                                                />
                                            </td>
                                            <td>{user.prenom} {user.nom}</td>
                                            <td>{user.email}</td>
                                            <td><span className={`badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span></td>
                                            <td>
                                                <span className={`badge bg-${user.estActif ? 'success' : 'danger'}`}>
                                                    {user.estActif ? 'Actif' : 'Bloqué'}
                                                </span>
                                            </td>
                                            <td>{new Date(user.dateCreation).toLocaleDateString('fr-FR')}</td>
                                            <td className="text-center">
                                                {/* Actions individuelles : BLOCAGE / DÉBLOCAGE */}
                                                <div className="btn-group btn-group-sm">
                                                   
                                                    <button 
                                                        className="btn btn-outline-warning" 
                                                        title={user.estActif ? 'Bloquer l\'utilisateur' : 'Débloquer l\'utilisateur'}
                                                        onClick={() => handleToggleBlock(user)} // 👈 Appel de la nouvelle fonction
                                                        disabled={isActionPending} // Désactiver pendant l'action
                                                    >
                                                        <i className={`bi bi-${user.estActif ? 'lock' : 'unlock'}`}></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {users.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={users.length}
                />
            )}
        </div>
    );
};

export default UserManagementComponent;