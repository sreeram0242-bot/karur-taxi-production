package com.karurtaxi.driver.ui

import android.app.Dialog
import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Bundle
import android.os.CountDownTimer
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import com.karurtaxi.driver.R

class DispatchFlashDialog(
    context: Context,
    private val rideId: String,
    private val earningsText: String, // e.g. "₹145"
    private val distanceText: String, // e.g. "2.4 km"
    private val pickupAddress: String,
    private val dropAddress: String,
    private val onAccept: (String) -> Unit,
    private val onDecline: (String) -> Unit
) : Dialog(context, android.R.style.Theme_Black_NoTitleBar_Fullscreen) {

    private var ringtone: Ringtone? = null
    private var countDownTimer: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        setContentView(R.layout.dialog_dispatch_flash)
        window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        setCancelable(false)

        val tvEarnings = findViewById<TextView>(R.id.tv_earnings)
        val tvDistance = findViewById<TextView>(R.id.tv_distance)
        val tvPickup = findViewById<TextView>(R.id.tv_pickup_address)
        val tvDrop = findViewById<TextView>(R.id.tv_drop_address)
        val progressBar = findViewById<ProgressBar>(R.id.pb_countdown)
        val btnDecline = findViewById<Button>(R.id.btn_decline)
        val btnAccept = findViewById<Button>(R.id.btn_accept)

        tvEarnings.text = earningsText
        tvDistance.text = distanceText
        tvPickup.text = pickupAddress
        tvDrop.text = dropAddress

        // Play loud alert ringtone overriding standard notifications
        playUrgentAlarm()

        // 15-Second High-Urgency Countdown
        progressBar.max = 150
        countDownTimer = object : CountDownTimer(15000, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val progress = (millisUntilFinished / 100).toInt()
                progressBar.progress = progress
            }

            override fun onFinish() {
                stopAlarm()
                onDecline(rideId)
                dismiss()
            }
        }.start()

        // 30% Decline Button (Red)
        btnDecline.setOnClickListener {
            stopAlarm()
            countDownTimer?.cancel()
            onDecline(rideId)
            dismiss()
        }

        // 70% Accept Button (Green)
        btnAccept.setOnClickListener {
            stopAlarm()
            countDownTimer?.cancel()
            onAccept(rideId)
            dismiss()
        }
    }

    private fun playUrgentAlarm() {
        try {
            val alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ringtone = RingtoneManager.getRingtone(context, alertUri)?.apply {
                audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                play()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarm() {
        try {
            ringtone?.stop()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDetachedFromWindow() {
        stopAlarm()
        countDownTimer?.cancel()
        super.onDetachedFromWindow()
    }
}
