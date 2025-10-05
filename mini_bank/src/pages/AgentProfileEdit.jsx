import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService'; // Assurez-vous que le chemin est correct

const AgentProfileEdit = () => {
    // --- États et Références ---
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // Référence pour l'input de fichier caché
    const fileInputRef = useRef(null); 

    // --- Fonctions utilitaires ---

    // Fonction pour extraire les initiales
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2); // Limite à 2 initiales
    };

    // --- Chargement des données de l'Agent ---

    useEffect(() => {
        // Idéalement, les données de l'agent actuel (connecté) seraient chargées ici
        const fetchAgentData = async () => {
            try {
                // Simuler la récupération des données de l'utilisateur actuel
                const currentUser = apiService.auth.getCurrentUser();
                
                if (currentUser) {
                    // Charger les données complètes (supposons qu'il existe un champ photoUrl)
                    // NOTE : Remplacez cet appel par votre propre logique de récupération des données de l'agent
                    const response = await apiService.users.getById(currentUser._id);
                    setAgent({
                        // ... champs de profil
                        nom: response.nom || currentUser.nom,
                        prenom: response.prenom || currentUser.prenom,
                        email: response.email || currentUser.email,
                        // Assurez-vous que l'URL de la photo est le champ correct de votre API
                        photoUrl: response.photoUrl || response.photo || currentUser.photoUrl || null
                    });
                } else {
                    setError("Agent non connecté.");
                }
            } catch (err) {
                setError(err.message || "Échec du chargement du profil.");
            } finally {
                setLoading(false);
            }
        };

        fetchAgentData();
    }, []);
    
    // --- Gestion du téléchargement de photo ---

    // 1. Déclenche le clic sur le champ de fichier caché
    const handlePhotoChangeClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // 2. Gère la sélection et l'upload du fichier
    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        // Le nom du champ (ici 'profilePicture') doit correspondre à ce que votre backend attend
        formData.append('profilePicture', file); 
        
        try {
            const response = await apiService.users.updateProfilePicture(formData);
            
            // Assumer que l'API retourne la nouvelle URL de la photo
            const newPhotoUrl = response.photoUrl || response.data?.photoUrl; 
            
            if (newPhotoUrl) {
                setAgent(prevAgent => ({ ...prevAgent, photoUrl: newPhotoUrl }));
                setSuccessMessage("Photo de profil mise à jour avec succès !");
            } else {
                 setSuccessMessage("Photo téléchargée, mais URL manquante dans la réponse.");
            }

        } catch (err) {
            console.error("Erreur d'upload de photo:", err);
            setError(`Erreur lors du téléchargement: ${err.message}`);
        } finally {
            setIsUploading(false);
            event.target.value = null; // Réinitialiser l'input
            setTimeout(() => setSuccessMessage(null), 5000); // Masquer le message
        }
    };
    
    // --- Rendu ---
    
    if (loading) {
        return <div className="text-center py-5">Chargement du profil...</div>;
    }

    if (error && !agent) {
        return <div className="alert alert-danger mx-4 mt-4">Erreur: {error}</div>;
    }

    // Agent non chargé
    if (!agent) {
        return <div className="alert alert-warning mx-4 mt-4">Impossible de récupérer les données du profil.</div>;
    }

    // Récupérer le nom complet pour les initiales
    const fullName = `${agent.prenom || ''} ${agent.nom || ''}`.trim();

    return (
        <div className="container py-4">
            <h2 className="mb-4">Modification du Profil Agent</h2>
            
            {/* Messages de feedback */}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card shadow-sm">
                <div className="card-body">
                    
                    <div className="row">
                        {/* Colonne 1 : Photo de profil */}
                        <div className="col-md-4 text-center border-end">
                            <h5 className="mb-3">Photo de Profil</h5>

                            {/* Affichage de la photo ou des initiales */}
                            {agent.photoUrl ? (
                                <img
                                    src={agent.photoUrl}
                                    alt="Photo de profil"
                                    className="rounded-circle mb-3 border border-3 border-primary"
                                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                />
                            ) : (
                                <div
                                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center mb-3"
                                    style={{ width: '150px', height: '150px', fontSize: '2.5rem', fontWeight: 'bold' }}
                                >
                                    {getInitials(fullName)}
                                </div>
                            )}

                            {/* Input de fichier caché */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={isUploading}
                            />

                            {/* Bouton pour déclencher la sélection de fichier */}
                            <button
                                className="btn btn-primary btn-sm d-block w-75 mx-auto"
                                onClick={handlePhotoChangeClick}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Téléchargement...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-cloud-upload me-2"></i>
                                        Changer la photo
                                    </>
                                )}
                            </button>
                            <small className="text-muted d-block mt-2">Max. 5MB, JPG/PNG</small>
                        </div>

                        {/* Colonne 2 : Formulaire de modification (Placeholders) */}
                        <div className="col-md-8">
                            <h5 className="mb-3">Informations de base</h5>
                            <form>
                                <div className="mb-3">
                                    <label className="form-label">Prénom</label>
                                    <input type="text" className="form-control" value={agent.prenom || ''} disabled />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Nom</label>
                                    <input type="text" className="form-control" value={agent.nom || ''} disabled />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control" value={agent.email || ''} disabled />
                                </div>

                                {/* Bouton de sauvegarde global (vous devrez implémenter le gestionnaire) */}
                                <button type="submit" className="btn btn-success mt-3">
                                    <i className="bi bi-save me-2"></i>
                                    Sauvegarder les modifications
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentProfileEdit;