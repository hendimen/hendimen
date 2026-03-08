<?php
// config.php
$host = 'localhost';
$username = 'root';     // default XAMPP
$password = '';         // default XAMPP kosong
$database = 'db_hendimen'; // Nama database Anda

// Buat koneksi
$conn = new mysqli($host, $username, $password, $database);

// Set charset ke UTF-8
$conn->set_charset("utf8");

// Cek koneksi
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Koneksi database gagal: ' . $conn->connect_error
    ]));
}

// Untuk debugging (hapus di production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>