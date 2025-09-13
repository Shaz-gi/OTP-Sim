import expo.modules.ReactActivityDelegateWrapper
package com.otpsim.myapp

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView

class MainActivity : ReactActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
    }

    override fun getMainComponentName(): String {
    return "main"
}

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(this, object : ReactActivityDelegate(this, mainComponentName) {
            override fun createRootView(): ReactRootView {
                val reactRootView = ReactRootView(context)
                reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)
                return reactRootView
            }
        })
    }
}

