<?php
        include('connexion.php');
        $requete = "UPDATE etudiant SET nom=?,prenom=?,adresse=? where cne=?";
        $resultat = $connDB->prepare($requete);
        $param=array("nom11","prenom11","adr11","cne1");
        $resultat->execute($param);
                            
        if ($connDB) {
                $connDB = NULL;
        }
        header("location:TestBD.php");
?>
