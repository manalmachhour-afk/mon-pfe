<?php
    include('connexion.php');
    $requete = "DELETE FROM etudiant";
    $resultat = $connDB->prepare($requete);
    $resultat->execute();
    if ($connDB) {
            $connDB = NULL;
    }
    header("location:TestBD.php");
    
?>