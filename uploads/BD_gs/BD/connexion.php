<?php 
	      define('d','mysql:host=localhost;dbname=gestion_stagiaires');
        define('u','root');
        define('m','');
        //try{
            //$connDB=new PDO(DB_DSN,DB_USER,DB_PASS);
        //$dsn = "mysql:host='localhost';dbname='ecole'";
        //$utilisateur = 'root';
        //$mdp = '';
          // création d'un objet PDO et connexion
          
        try {
               $connDB = new PDO(d, u, m);  
            } catch (Exception $erreur) {
                echo "Erreur : ".$erreur->getMessage(); 
                exit();
              }
?>