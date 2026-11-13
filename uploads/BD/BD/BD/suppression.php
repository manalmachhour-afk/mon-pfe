<?php
    include('connexion.php');
    $requete = "DELETE FROM etudiant WHERE cne=?";
    $resultat = $connDB->prepare($requete);
    $param=array("cne1");
    $resultat->execute($param);
    if ($connDB) {
            $connDB = NULL;
    }
    header("location:TestBD.php");
?>