<?php
session_start();
$con = mysqli_connect("localhost", "root", "", "myhmsdb");

if (isset($_POST['face_descriptor'])) {
    // Force JSON decode to return associative array, not object
    $face_descriptor = json_decode($_POST['face_descriptor'], true);

    if (!$face_descriptor || !is_array($face_descriptor)) {
        echo "invalid_data";
        exit();
    }

    $query = "SELECT * FROM patreg WHERE face_descriptor IS NOT NULL";
    $result = mysqli_query($con, $query);

    $min_distance = 100;
    $matched_user = null;

    while ($row = mysqli_fetch_array($result)) {
        // Force JSON decode to return associative array
        $stored_descriptor = json_decode($row['face_descriptor'], true);

        // Validate that stored descriptor is a valid array and matches length
        if (!is_array($stored_descriptor) || count($stored_descriptor) != count($face_descriptor)) {
            continue;
        }

        // Calculate Euclidean Distance
        $distance = 0;
        for ($i = 0; $i < count($face_descriptor); $i++) {
            $diff = $face_descriptor[$i] - $stored_descriptor[$i];
            $distance += $diff * $diff;
        }
        $distance = sqrt($distance);

        if ($distance < $min_distance) {
            $min_distance = $distance;
            $matched_user = $row;
        }
    }

    // Threshold for match (0.6 is standard)
    if ($min_distance < 0.6 && $matched_user) {
        $_SESSION['pid'] = $matched_user['pid'];
        $_SESSION['username'] = $matched_user['fname'] . " " . $matched_user['lname'];
        $_SESSION['fname'] = $matched_user['fname'];
        $_SESSION['lname'] = $matched_user['lname'];
        $_SESSION['gender'] = $matched_user['gender'];
        $_SESSION['contact'] = $matched_user['contact'];
        $_SESSION['email'] = $matched_user['email'];
        echo "success";
    } else {
        echo "failure: " . $min_distance;
    }
}
?>